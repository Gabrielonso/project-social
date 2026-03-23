import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

import { User } from '../modules/user/entity/user.entity';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { PostMedia } from 'src/modules/posts/entities/post-media.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { AdMedia } from 'src/modules/ads/entities/ads-media.entity';
import { Like } from 'src/modules/engagements/entities/like.entity';
import { Share } from 'src/modules/engagements/entities/share.entity';
import { Comment } from 'src/modules/engagements/entities/comment.entity';
import { Bookmark } from 'src/modules/engagements/entities/bookmark.entity';
import { Follow } from 'src/modules/engagements/entities/follow.entity';
import { Tag } from 'src/modules/engagements/entities/tag.entity';
import { Block } from 'src/modules/engagements/entities/block.entity';
dotenv.config();
export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.NODE_ENV === 'development'
      ? false
      : {
          rejectUnauthorized: true,
          ca: process.env.DB_SSL,
        },
  synchronize: process.env.DB_SYNCHRONIZATION === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    User,
    Post,
    Media,
    PostMedia,
    Ad,
    AdMedia,
    Like,
    Share,
    Comment,
    Bookmark,
    Follow,
    Tag,
    Block,
  ],
  migrations: [],
};
