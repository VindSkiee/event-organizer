import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, CommunityGroup } from '@prisma/client';

// 1. TYPE CUSTOM
// Penting! Kita sering butuh data Group + Saldo Wallet-nya
export type GroupWithWallet = Prisma.CommunityGroupGetPayload<{
  include: { 
    wallet: true;
  };
}>;

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CREATE GROUP + WALLET (Atomic)
   * Fitur nested write Prisma menjamin:
   * Jika Wallet gagal dibuat, Group juga batal dibuat. Aman!
   */
  async createWithWallet(data: Prisma.CommunityGroupCreateInput): Promise<CommunityGroup> {
    return this.prisma.communityGroup.create({
      data: {
        ...data,
        // Otomatis buat wallet dengan saldo 0 saat Group dibuat
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });
  }

  /**
   * Cari Group by ID (Termasuk Wallet)
   * Berguna untuk validasi atau dashboard keuangan
   */
  async findById(id: number): Promise<GroupWithWallet | null> {
    return this.prisma.communityGroup.findUnique({
      where: { id },
      include: {
        wallet: true, // Include Wallet agar bisa cek saldo
      },
    });
  }

  /**
   * Ambil semua list Group
   * Bisa difilter by Type ('RT' atau 'RW')
   */
  async findAll(type?: string): Promise<CommunityGroup[]> {
    return this.prisma.communityGroup.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' }, // Urutkan nama A-Z (RT 01, RT 02...)
    });
  }

  /**
   * Update Group (Ganti Nama/Tipe)
   */
  async update(id: number, data: Prisma.CommunityGroupUpdateInput): Promise<CommunityGroup> {
    return this.prisma.communityGroup.update({
      where: { id },
      data,
    });
  }

  /**
   * Cek apakah Group dengan ID tersebut ada?
   * Method ringan (hanya select id) untuk validasi cepat
   */
  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.communityGroup.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * DELETE GROUP
   * Hati-hati: Pastikan Schema Prisma menggunakan onDelete: Cascade 
   * atau pastikan Group kosong sebelum dihapus agar tidak error constraint.
   */
  async delete(id: number): Promise<CommunityGroup> {
    return this.prisma.communityGroup.delete({
      where: { id },
    });
  }
}