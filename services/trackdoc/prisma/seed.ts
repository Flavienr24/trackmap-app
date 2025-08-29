import { PrismaClient } from '@prisma/client'
import { generateSlug, generateUniqueSlug } from '../src/utils/slugs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data
  await prisma.eventHistory.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.variableValue.deleteMany()
  await prisma.event.deleteMany()
  await prisma.page.deleteMany()
  await prisma.variable.deleteMany()
  await prisma.suggestedValue.deleteMany()
  await prisma.product.deleteMany()

  // Create MyServier product
  const product = await prisma.product.create({
    data: {
      name: 'MyServier',
      slug: 'myservier',
      description: 'Content hub for health care professionals'
    }
  })
  console.log('✅ Created product: MyServier')

  // Create pages
  const homePage = await prisma.page.create({
    data: {
      productId: product.id,
      name: 'Homepage',
      slug: 'homepage',
      url: 'https://myservier.pt/'
    }
  })

  const articlesPage = await prisma.page.create({
    data: {
      productId: product.id,
      name: 'Articles',
      slug: 'articles',
      url: 'https://myservier.pt/article/nova-ferramenta-de-conversao-iecas-e-aras-powered-by-servier-cardiovascular/'
    }
  })
  console.log('✅ Created pages: Homepage, Articles')

  // Create variables
  const pageNameVar = await prisma.variable.create({
    data: {
      productId: product.id,
      name: 'page_name',
      type: 'STRING',
      description: 'Nom de la page visitée'
    }
  })

  const pageCategoryVar = await prisma.variable.create({
    data: {
      productId: product.id,
      name: 'page_category',
      type: 'STRING',
      description: 'Catégorie de la page'
    }
  })
  console.log('✅ Created variables: page_name, page_category')

  // Create suggested values
  const homepageValue = await prisma.suggestedValue.create({
    data: {
      productId: product.id,
      value: 'homepage',
      isContextual: false
    }
  })

  const articlesValue = await prisma.suggestedValue.create({
    data: {
      productId: product.id,
      value: 'articles',
      isContextual: false
    }
  })

  const contextualPageValue = await prisma.suggestedValue.create({
    data: {
      productId: product.id,
      value: '$page-name',
      isContextual: true
    }
  })
  console.log('✅ Created suggested values: homepage, articles, $page-name')

  // Create events
  const pageViewEvent = await prisma.event.create({
    data: {
      pageId: homePage.id,
      name: 'page_view',
      status: 'TO_IMPLEMENT',
      variables: JSON.stringify({
        page_name: 'homepage',
        page_category: 'landing'
      })
    }
  })

  const clickEvent = await prisma.event.create({
    data: {
      pageId: articlesPage.id,
      name: 'click',
      status: 'TO_TEST',
      variables: JSON.stringify({
        page_name: 'articles',
        page_category: 'content'
      })
    }
  })
  console.log('✅ Created events: page_view, click')

  // Associate variables with suggested values
  await prisma.variableValue.create({
    data: {
      variableId: pageNameVar.id,
      suggestedValueId: homepageValue.id
    }
  })

  await prisma.variableValue.create({
    data: {
      variableId: pageNameVar.id,
      suggestedValueId: articlesValue.id
    }
  })

  await prisma.variableValue.create({
    data: {
      variableId: pageNameVar.id,
      suggestedValueId: contextualPageValue.id
    }
  })
  console.log('✅ Created variable associations')

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })