import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding started...')

  // Create reporter user
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@example.com' },
    update: {},
    create: {
      email: 'reporter@example.com',
      password: 'reporterpassword', // hash in real apps
      name: faker.person.fullName(),
      role: 'REPORTER', // Enum as string
    },
  })

  console.log('👤 Reporter created')

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
  const articlePromises = Array.from({ length: 20 }).map(() => {
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

  await Promise.all(articlePromises)

  console.log('📝 20 Articles created')
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
