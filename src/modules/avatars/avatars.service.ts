import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avatar } from '../../database/entities/avatar.entity';
import { CzUserErrorCodes } from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import { CreateAvatarDto } from './dto/create-avatar.dto';
import { ListAdminAvatarsDto } from './dto/list-admin-avatars.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

const publicFields = { cz_avatar_id: true, label: true, image_url: true, display_order: true } as const;

@Injectable()
export class AvatarsService {
  constructor(
    @InjectRepository(Avatar)
    private readonly avatars: Repository<Avatar>,
  ) {}

  /** The picker: active avatars in the admin's order. */
  async listActive() {
    const data = await this.avatars.find({ select: publicFields, where: { is_active: true }, order: { display_order: 'ASC', label: 'ASC' } });
    return { data, total: data.length };
  }

  /** An avatar the user may pick right now; inactive ones read as missing. */
  async getActiveOrFail(cz_avatar_id: string): Promise<Avatar> {
    const avatar = await this.avatars.findOne({ where: { cz_avatar_id, is_active: true } });
    if (!avatar) throw new NotFoundException({ cz_error_code: CzUserErrorCodes.AVATAR_NOT_FOUND });
    return avatar;
  }

  async listAdmin(query: ListAdminAvatarsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [data, total] = await this.avatars.findAndCount({
      where: query.is_active === undefined ? {} : { is_active: query.is_active },
      order: { display_order: 'ASC', label: 'ASC' },
      skip,
      take,
    });
    return { data, total };
  }

  create(dto: CreateAvatarDto) {
    return this.avatars.save(this.avatars.create(dto));
  }

  async update(cz_avatar_id: string, dto: UpdateAvatarDto) {
    const avatar = await this.avatars.findOne({ where: { cz_avatar_id } });
    if (!avatar) throw new NotFoundException({ cz_error_code: CzUserErrorCodes.AVATAR_NOT_FOUND });
    return this.avatars.save(Object.assign(avatar, dto));
  }

  // Users wearing it keep the picture URL; the foreign key clears their avatar_id.
  async remove(cz_avatar_id: string) {
    const result = await this.avatars.delete({ cz_avatar_id });
    if (!result.affected) throw new NotFoundException({ cz_error_code: CzUserErrorCodes.AVATAR_NOT_FOUND });
    return { deleted: true };
  }
}
