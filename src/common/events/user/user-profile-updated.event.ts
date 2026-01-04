export class UserProfileUpdatedEvent {
  userId: string;
  username?: string;
  profilePicture?: string;
}

//   @OnEvent('user.profile.updated')
// async handleUserProfileUpdated(event: UserProfileUpdatedEvent) {
//   const { userId, username, profilePicture } = event;

//   if (username || profilePicture) {
//     await this.dataSource.transaction(async (manager) => {
//       await manager.update(
//         Post,
//         { ownerId: userId },
//         {
//           ...(username && { ownerUsername: username }),
//           ...(profilePicture && { ownerAvatar: profilePicture }),
//         },
//       );

//       await manager.update(
//         Ad,
//         { ownerId: userId },
//         {
//           ...(username && { ownerUsername: username }),
//           ...(profilePicture && { ownerAvatar: profilePicture }),
//         },
//       );
//     });
//   }
// }
