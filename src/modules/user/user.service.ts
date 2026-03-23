import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

import { UserFilterByEnum } from './interfaces/user.interfaces';
import { UserQueryFilterDto } from './dto/user-query-filter.dto';
import {
  baseUsername,
  endOfEndDate,
  startOfStartDate,
} from 'src/common/utils/utilityFunctions';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { Follow } from 'src/modules/engagements/entities/follow.entity';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { UserRoles } from 'src/common/enums/user-roles.constants';

@Injectable()
export class UserService {
  private nanoid: any;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    const alphabet = '0123456789';
    this.nanoid = customAlphabet(alphabet, 16);
  }

  async get(query: UserQueryFilterDto, authUserId?: string) {
    try {
      const page = Number(query.page) || 1;
      const limit = query.limit ? Number(query.limit) : null;
      const skip = limit ? (page - 1) * limit : 0;
      console.log(query);
      const qb = this.userRepository
        .createQueryBuilder('user')
        .where('user.verified = :verified', {
          verified: true,
        })
        .andWhere('user.role = :role', {
          role: UserRoles.USER,
        });

      // if (query.status) {
      //   qb.andWhere('user.status = :status', { status: query.status });
      // }

      if (query.search) {
        qb.andWhere(
          `(user.firstName LIKE :search 
            OR user.lastName LIKE :search 
            OR user.email LIKE :search 
            OR user.userRefId LIKE :search 
            OR CAST(user.id AS TEXT) LIKE :search 
            OR user.username LIKE :search)`,
          { search: `%${query.search}%` },
        );
      }
      // const start = query.startDate
      //   ? startOfStartDate(query.startDate)
      //   : undefined;
      // const end = query.endDate ? endOfEndDate(query.endDate) : undefined;

      // if (query.filterBy === UserFilterByEnum.dob && start && end) {
      //   const startMMDD = start.toISOString().slice(5, 10);
      //   const endMMDD = end.toISOString().slice(5, 10);
      //   qb.andWhere(`DATE_FORMAT(user.dob, '%m-%d') BETWEEN :start AND :end`, {
      //     start: startMMDD,
      //     end: endMMDD,
      //   });
      // }

      // if (start && query.filterBy !== UserFilterByEnum.dob) {
      //   qb.andWhere('user.createdAt >= :startDate', { startDate: start });
      // }
      // if (end && query.filterBy !== UserFilterByEnum.dob) {
      //   qb.andWhere('user.createdAt <= :endDate', { endDate: end });
      // }
      // if (query.filterBy === UserFilterByEnum.dob) {
      //   qb.orderBy(`TO_CHAR(user.dob, 'MM-DD')`, 'ASC');
      // } else {
      //   qb.orderBy('user.createdAt', 'DESC');
      // }
      qb.orderBy('user.createdAt', 'DESC');
      if (limit) {
        qb.skip(skip).take(limit);
      }

      const [data, total] = await qb.getManyAndCount();

      return {
        statusCode: HttpStatus.OK,
        message: 'Operation successful',
        data: {
          data,
          total,
          currentPage: page,
          totalPages: limit ? Math.ceil(total / limit) : 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getDeletedUsers() {
    const users = await this.userRepository.find({
      where: { deletedAt: IsNull() },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'dob',
        'phoneCode',
        'phoneNumber',
        'status',
        'deletedAt',
      ],
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Operation successful',
      data: users,
    };
  }

  async create(createUserDto: CreateUserDto) {
    const { firstName, lastName, createOption, email, profilePicture } =
      createUserDto;
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const userRepo = entityManager.getRepository(User);
          let unique = false;
          let finalUsername: string = '';
          while (!unique) {
            const randNum = this.nanoid(5);
            const base = baseUsername(firstName, lastName);
            const username = `${base}${randNum}`;

            const existingUserName = await userRepo.findOne({
              where: { username },
            });
            if (!existingUserName) {
              finalUsername = username; // assign to finalUsername
              unique = true;
            }
          }
          const user = userRepo.create({
            firstName,
            lastName,
            createdWith: createOption,
            email,
            verified: true,
            profilePicture,
            username: finalUsername,
          });
          return await userRepo.save(user);
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async update(updateUserDto: UpdateUserDto, userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existingUsername = await this.userRepository.findOne({
          where: { username: updateUserDto.username },
        });
        if (existingUsername && existingUsername.id !== userId) {
          throw new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message: 'Username is already taken',
            },
            HttpStatus.CONFLICT,
          );
        }
      }
      let dob = new Date();

      if (updateUserDto.dob && updateUserDto.dob !== undefined) {
        dob = new Date(updateUserDto?.dob);
        dob.setHours(1, 0, 0, 0);
        updateUserDto.dob = dob;
      }
      await this.userRepository.update(userId, {
        ...(updateUserDto.firstName &&
          updateUserDto.firstName !== undefined && {
            firstName: updateUserDto.firstName,
          }),
        ...(updateUserDto.lastName &&
          updateUserDto.lastName !== undefined && {
            lastName: updateUserDto.lastName,
          }),
        ...(updateUserDto.username &&
          updateUserDto.username !== undefined && {
            username: updateUserDto.username,
          }),
        ...(updateUserDto.bio &&
          updateUserDto.bio !== undefined && {
            bio: updateUserDto.bio,
          }),
        ...(updateUserDto.countryCode &&
          updateUserDto.countryCode !== undefined && {
            countryCode: updateUserDto.countryCode,
          }),
        ...(updateUserDto.profilePictureUrl && {
          profilePicture: updateUserDto.profilePictureUrl,
        }),
        ...(updateUserDto.dob &&
          updateUserDto.dob !== undefined && {
            dob,
          }),
      });
      // if (
      //   oldUser.username !== newUser.username ||
      //   oldUser.profilePicture !== newUser.profilePicture
      // ) {
      //   this.eventEmitter.emit(
      //     'user.profile.updated',
      //     {
      //       userId: user.id,
      //       username: user.username,
      //       profilePicture: user.profilePicture,
      //     },
      //   );
      // }

      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully updated user',
      };
    } catch (error) {
      throw error;
    }
  }

  async getUser(id: string, authUserId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const followRepo = this.dataSource.getRepository(Follow);
      const postRepo = this.dataSource.getRepository(Post);
      const adRepo = this.dataSource.getRepository(Ad);

      const [followersCount, followingCount, posts, ads] = await Promise.all([
        followRepo.count({ where: { followingId: id } }),
        followRepo.count({ where: { followerId: id } }),
        postRepo.count({ where: { ownerId: id } }),
        adRepo.count({ where: { ownerId: id } }),
      ]);
      const follows = await followRepo.find({
        where: [
          { followerId: id, followingId: authUserId },
          { followerId: authUserId, followingId: id },
        ],
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Operation successful',
        data: {
          ...user,
          followersCount,
          followingCount,
          postsCount: posts + ads,
          isMyfollower: follows
            ?.map((follow) => follow?.followerId)
            ?.includes(id)
            ? true
            : false,
          iFollow: follows?.map((follow) => follow?.followingId)?.includes(id)
            ? true
            : false,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getMyUserDetails(id: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const followRepo = this.dataSource.getRepository(Follow);
      const postRepo = this.dataSource.getRepository(Post);
      const adRepo = this.dataSource.getRepository(Ad);

      const [followersCount, followingCount, posts, ads] = await Promise.all([
        followRepo.count({ where: { followingId: id } }),
        followRepo.count({ where: { followerId: id } }),
        postRepo.count({ where: { ownerId: id } }),
        adRepo.count({ where: { ownerId: id } }),
      ]);

      return {
        statusCode: HttpStatus.OK,
        message: 'Operation successful',
        data: {
          ...user,
          followersCount,
          followingCount,
          postsCount: posts + ads,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async deleteUserAccount(id: string) {
    // await this.userRepository.delete(id);
    await this.userRepository.softDelete({ id });
    return {
      statusCode: HttpStatus.OK,
      message: 'Successfully deleted user',
    };
  }

  private hashPassword(password: string) {
    return hash(password, 10);
  }

  async updateUserStatus(
    updateUserStatusDto: UpdateUserStatusDto,
    userId: string,
  ) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      await this.userRepository.update(userId, {
        status: updateUserStatusDto.status,
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully updated user status',
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteMyAccount(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new NotFoundException('User account already deleted');
    }

    await this.userRepository.update(
      { id },
      {
        deletedAt: new Date(),
      },
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Successfully deleted account',
    };
  }

  async restoreUser(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!user.deletedAt) {
      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'User was not deleted',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.userRepository.update(
      { id: user.id },
      {
        deletedAt: null,
      },
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Successfully restored user account',
    };
  }

  async verifyUsername(username: string) {
    try {
      if (!username) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Username is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const existing = await this.userRepository.findOne({
        where: { username },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Operation successful',
        data: {
          available: !existing,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async toggleUserSocialMode(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.userRepository.update(userId, {
        socialMode: !user.socialMode,
      });
      return {
        statusCode: HttpStatus.OK,
        message: `User's social mode has been turned ${!user?.socialMode}`,
      };
    } catch (error) {
      throw error;
    }
  }
}
