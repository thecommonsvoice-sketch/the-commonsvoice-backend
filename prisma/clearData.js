// ESM version (since your project uses "type": "module")
import { prisma } from './client.js'; // Make sure client.js exists in /prisma

async function main() {
  console.log('🧹 Deleting seeded data...');

  await prisma.bookmark.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.articleVideo.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.article.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All data (except Category and LatestNews) deleted.');
}

main()
  .catch((e) => {
    console.error('❌ Error while deleting data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
