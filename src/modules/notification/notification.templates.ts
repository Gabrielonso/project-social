export const NotificationTemplates = {
  followed: (args: { followerUsername?: string }) => ({
    title: 'New follower',
    body: args.followerUsername
      ? `${args.followerUsername} started following you`
      : 'Someone started following you',
  }),
  postLiked: (args: { likerUsername?: string }) => ({
    title: 'New like',
    body: args.likerUsername
      ? `${args.likerUsername} liked your post`
      : 'Someone liked your post',
  }),
  postCommented: (args: { commenterUsername?: string }) => ({
    title: 'New comment',
    body: args.commenterUsername
      ? `${args.commenterUsername} commented on your post`
      : 'Someone commented on your post',
  }),
  taggedInPost: (args: { taggerUsername?: string }) => ({
    title: 'You were tagged',
    body: args.taggerUsername
      ? `${args.taggerUsername} tagged you in a post`
      : 'You were tagged in a post',
  }),
};

