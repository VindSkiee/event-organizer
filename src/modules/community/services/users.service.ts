import { 
  BadRequestException, 
  ConflictException, 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SystemRoleType, Prisma } from '@prisma/client';

import { UsersRepository, UserWithRelations } from '../repositories/users.repository';
import { PrismaService } from '@database/prisma.service'; // Perlu akses Prisma untuk cek Role/Group

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-pasword.dto';
import { UserFilterDto } from '../dto/user-filter.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService, 
  ) {}

  /**
   * CREATE USER (Admin/Leader Only)
   * Logika:
   * 1. Cek email duplikat.
   * 2. Tentukan Community Group ID (Leader hanya bisa tambah ke grup sendiri).
   * 3. Cari Role ID berdasarkan Enum.
   * 4. Hash Password.
   * 5. Simpan.
   */
  async create(requester: UserWithRelations, dto: CreateUserDto) {
    // 1. Cek Email Unik
    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // 2. Tentukan Target Group ID (Security Check)
    let targetGroupId = dto.communityGroupId;

    if (requester.role.type === SystemRoleType.ADMIN) {
      // Admin RT DILARANG mendaftarkan warga ke RT lain
      targetGroupId = requester.communityGroupId; 
    } else if (requester.role.type === SystemRoleType.LEADER) {
      // Leader RW WAJIB pilih group ID
      if (!targetGroupId) {
        throw new BadRequestException('Community Group ID wajib diisi oleh Leader');
      }
    }

    // 3. Cari Role ID dari Database berdasarkan Enum DTO
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleType },
    });
    if (!role) {
      throw new BadRequestException(`Role type '${dto.roleType}' tidak valid`);
    }

    // 4. Hash Password (Default: "Warga123!" jika kosong)
    const passwordToHash = dto.password || 'Warga123!';
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    // 5. Simpan ke Repository
    const newUser = await this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      password: hashedPassword,
      phone: dto.phone,
      address: dto.address,
      
      // Relasi
      role: { connect: { id: role.id } },
      communityGroup: { connect: { id: targetGroupId } },
      createdBy: { connect: { id: requester.id } },
    });

    return this.sanitizeUser(newUser);
  }

  /**
   * FIND ALL (Smart Filter)
   * Logika:
   * 1. Admin RT hanya bisa lihat warga RT-nya sendiri.
   * 2. Leader RW bisa lihat semua atau filter per RT.
   * 3. Support Search by Name/Email.
   */
  async findAll(requester: UserWithRelations, dto: UserFilterDto) {
    // 1. SETUP PAGINATION
    const page = dto.page || 1;
    const limit = dto.limit || 10;

    // 2. BANGUN QUERY FILTER (WHERE)
    const where: Prisma.UserWhereInput = {
      isActive: true, // Default: Hanya tampilkan user yang masih aktif
      AND: [],
    };

    // A. Filter Pencarian Teks (Nama atau Email)
    if (dto.search) {
      (where.AND as any[]).push({
        OR: [
          { fullName: { contains: dto.search, mode: 'insensitive' } },
          { email: { contains: dto.search, mode: 'insensitive' } },
        ],
      });
    }

    // B. Filter Role User (Misal: Cari yang 'TREASURER' saja)
    if (dto.roleType) {
      (where.AND as any[]).push({
        role: { name: dto.roleType }, // Asumsi field name di table Role match dengan Enum
      });
    }

    // C. FILTER COMMUNITY GROUP (PENTING!)
    if (dto.communityGroupId) {
       // Filter eksplisit dari Frontend (misal Admin RW milih RT 05)
      (where.AND as any[]).push({
        communityGroupId: dto.communityGroupId,
      });
    }

    // D. SECURITY SCOPE (Siapa yang me-request?)
    if (requester.role.type === SystemRoleType.ADMIN) {
      // KASUS ADMIN RT:
      // Paksa filter ke Group ID dia sendiri.
      // Dia tidak boleh melihat data RT lain.
      (where.AND as any[]).push({
        communityGroupId: requester.communityGroupId,
      });
    } 
    // KASUS LEADER (RW):
    // Tidak ada penambahan filter paksa. Dia bebas melihat semua.
    // Filter hanya berlaku jika dia mengirim dto.communityGroupId (Poin C).

    // 3. EKSEKUSI QUERY KE REPOSITORY
    const [users, total] = await this.usersRepository.findAll({
      skip: (page - 1) * limit,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' }, // User terbaru paling atas
    });

    // 4. MAPPING DATA (SANITASI & PRIVACY)
    const processedUsers = users.map((user) => {
      // --- LOGIC PRIVACY WALLET ---
      // Clone user object agar aman
      const userView = { ...user };
      
      // Cek apakah Wallet boleh dilihat?
      // Syarat boleh lihat: 
      // 1. Requester adalah LEADER (RW) -> Boleh lihat semua.
      // 2. Requester satu Group dengan User (Sesama RT) -> Boleh lihat.
      const isRequesterRW = requester.role.type === SystemRoleType.LEADER;
      const isSameGroup = requester.communityGroupId === user.communityGroupId;

      // Jika BUKAN RW dan BEDA Group, hapus walletnya
      if (!isRequesterRW && !isSameGroup) {
        if (userView.communityGroup) {
          // Kita hapus properti wallet dari object communityGroup
          // Menggunakan 'any' karena TS akan protes kita menghapus property wajib
          delete (userView.communityGroup as any).wallet;
        }
      }

      // --- LOGIC SANITASI PASSWORD ---
      return this.sanitizeUser(userView);
    });

    // 5. RETURN FORMAT PAGINATION
    return {
      data: processedUsers,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * FIND ONE (Profile)
   */
  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return this.sanitizeUser(user);
  }

  /**
   * UPDATE PROFILE (Self Service)
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Jika ganti email, pastikan email baru belum dipakai orang lain
    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email sudah digunakan user lain');
      }
    }

    const updatedUser = await this.usersRepository.update(userId, {
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * CHANGE PASSWORD
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // 1. Ambil user + password lama dari DB
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User tidak ditemukan');

    // 2. Verifikasi Password Lama
    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Password lama salah');
    }

    // 3. Hash Password Baru
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // 4. Simpan
    await this.usersRepository.update(userId, {
      password: hashedPassword,
    });

    return { message: 'Password berhasil diperbarui' };
  }

  /**
   * HELPER: Buang field sensitif sebelum dikirim ke Controller
   */
  private sanitizeUser(user: any) {
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }
}