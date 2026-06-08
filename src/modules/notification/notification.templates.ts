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
  postReposted: (args: { reposterUsername?: string }) => ({
    title: 'New repost',
    body: args.reposterUsername
      ? `${args.reposterUsername} reposted your post`
      : 'Someone reposted your post',
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
  mentionedInPost: (args: { taggerUsername?: string }) => ({
    title: 'You were mentioned',
    body: args.taggerUsername
      ? `${args.taggerUsername} mentioned you in a post`
      : 'Someone mentioned you in a post',
  }),
  commentReply: (args: { replierUsername?: string }) => ({
    title: 'New reply',
    body: args.replierUsername
      ? `${args.replierUsername} replied to your comment`
      : 'Someone replied to your comment',
  }),
  adLiked: (args: { likerUsername?: string }) => ({
    title: 'New like',
    body: args.likerUsername
      ? `${args.likerUsername} liked your ad`
      : 'Someone liked your ad',
  }),
  adCommented: (args: { commenterUsername?: string }) => ({
    title: 'New comment',
    body: args.commenterUsername
      ? `${args.commenterUsername} commented on your ad`
      : 'Someone commented on your ad',
  }),
  incomingCall: (args: { callerUsername?: string; callType?: string }) => ({
    title: 'Incoming call',
    body: args.callerUsername
      ? `${args.callerUsername} is calling you`
      : 'Someone is calling you',
  }),
  chatMessage: (args: {
    senderUsername?: string;
    messagePreview?: string;
  }) => {
    const preview = args.messagePreview?.trim();
    const sender = args.senderUsername || 'Someone';
    return {
      title: sender,
      body: preview || 'Sent you a message',
    };
  },
};
