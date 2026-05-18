import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding started...')

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 10)
  const hashedReporterPassword = await bcrypt.hash('reporterpassword', 10)

  // Create reporter user
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@example.com' },
    update: {},
    create: {
      email: 'reporter@example.com',
      password: hashedReporterPassword, // Hashed with bcrypt
      name: faker.person.fullName(),
      role: 'REPORTER', // Enum as string
    },
  })

  console.log('👤 Reporter created')

  // Create test users for comments
  const testUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {},
      create: {
        email: 'user1@example.com',
        password: hashedPassword, // Hashed with bcrypt
        name: faker.person.fullName(),
        role: 'USER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: {
        email: 'user2@example.com',
        password: hashedPassword, // Hashed with bcrypt
        name: faker.person.fullName(),
        role: 'USER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'user3@example.com' },
      update: {},
      create: {
        email: 'user3@example.com',
        password: hashedPassword, // Hashed with bcrypt
        name: faker.person.fullName(),
        role: 'USER',
      },
    }),
  ])

  console.log('👥 Test users created:', testUsers.length)

  // Create categories
  const categoryNames = ['Technology', 'Health', 'Business', 'Entertainment', 'Science']

  const categories = await Promise.all(
    categoryNames.map((name) => {
      const slug = name.toLowerCase()
      return prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name,
          slug,
          description: faker.lorem.sentence(),
        },
      })
    })
  )

  console.log('📚 Categories created:', categories.length)

  // Create 20 articles
  const articles = await Promise.all(
    Array.from({ length: 20 }).map(() => {
      const title = faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, '')
      const slug = faker.helpers.slugify(title.toLowerCase())
      const content = faker.lorem.paragraphs(5)
      const excerpt = faker.lorem.sentences(2)
      const metaTitle = faker.lorem.words(5)
      const metaDescription = faker.lorem.sentence(10)
      const randomCategory = faker.helpers.arrayElement(categories)

      return prisma.article.create({
        data: {
          title,
          slug,
          content,
          excerpt,
          metaTitle,
          metaDescription,
          status: 'PUBLISHED', // Enum as string
          authorId: reporter.id,
          categoryId: randomCategory.id,
          coverImage: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
          ogImage: faker.image.urlPicsumPhotos({ width: 1200, height: 630 }),
        },
      })
    })
  )

  console.log('📝 20 Articles created')

  // Create comments and nested replies
  for (const article of articles.slice(0, 5)) {
    // Create 2-3 root comments per article
    for (let i = 0; i < faker.number.int({ min: 2, max: 3 }); i++) {
      const rootComment = await prisma.comment.create({
        data: {
          content: faker.lorem.sentences(2),
          userId: faker.helpers.arrayElement(testUsers).id,
          articleId: article.id,
        },
      })

      // Create 1-3 nested replies to each root comment
      for (let j = 0; j < faker.number.int({ min: 1, max: 3 }); j++) {
        const reply1 = await prisma.comment.create({
          data: {
            content: faker.lorem.sentences(1),
            userId: faker.helpers.arrayElement(testUsers).id,
            articleId: article.id,
            parentId: rootComment.id,
          },
        })

        // Create nested-nested replies (2 levels deep)
        if (faker.datatype.boolean()) {
          await prisma.comment.create({
            data: {
              content: faker.lorem.sentences(1),
              userId: faker.helpers.arrayElement(testUsers).id,
              articleId: article.id,
              parentId: reply1.id,
            },
          })
        }
      }
    }
  }

  console.log('💬 Comments and nested replies created')
}

main()
  .then(() => {
    console.log('✅ Seed complete')
  })
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
