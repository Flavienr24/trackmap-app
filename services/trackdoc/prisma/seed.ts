import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (in reverse dependency order)
  await prisma.eventHistory.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.event.deleteMany()
  await prisma.page.deleteMany()
  await prisma.propertyValue.deleteMany()
  await prisma.property.deleteMany()
  await prisma.suggestedValue.deleteMany()
  await prisma.product.deleteMany()

  // Create products
  const myservier = await prisma.product.create({
    data: {
      name: 'MySERVIER',
      url: 'https://myservier.fr',
      description: 'Plateforme patient MySERVIER'
    }
  })

  const eservices = await prisma.product.create({
    data: {
      name: 'Patient E-Services',
      url: 'https://patient.e-servier.com',
      description: 'Portail patient E-Services Servier'
    }
  })
  console.log('✅ Created products: MySERVIER, Patient E-Services')

  // Create pages
  const homepage = await prisma.page.create({
    data: {
      productId: myservier.id,
      name: 'Homepage',
      slug: 'homepage',
      url: 'https://myservier.fr/'
    }
  })

  const loginPage = await prisma.page.create({
    data: {
      productId: myservier.id,
      name: 'Login',
      slug: 'login',
      url: 'https://myservier.fr/login'
    }
  })

  const dashboard = await prisma.page.create({
    data: {
      productId: eservices.id,
      name: 'Dashboard',
      slug: 'dashboard',
      url: 'https://patient.e-servier.com/dashboard'
    }
  })
  console.log('✅ Created pages: Homepage, Login, Dashboard')

  // Create properties
  const pageNameProp = await prisma.property.create({
    data: {
      productId: myservier.id,
      name: 'page_name',
      type: 'STRING',
      description: 'Nom de la page visitée'
    }
  })

  const buttonNameProp = await prisma.property.create({
    data: {
      productId: myservier.id,
      name: 'button_name',
      type: 'STRING',
      description: 'Nom du bouton cliqué'
    }
  })
  console.log('✅ Created properties: page_name, button_name')

  // Create suggested values
  const homeValue = await prisma.suggestedValue.create({
    data: {
      productId: myservier.id,
      value: 'Homepage',
      isContextual: false
    }
  })

  const loginValue = await prisma.suggestedValue.create({
    data: {
      productId: myservier.id,
      value: 'Login',
      isContextual: false
    }
  })

  const contextualValue = await prisma.suggestedValue.create({
    data: {
      productId: myservier.id,
      value: '$page-name',
      isContextual: true
    }
  })
  console.log('✅ Created suggested values')

  // Link properties with suggested values
  await prisma.propertyValue.create({
    data: {
      propertyId: pageNameProp.id,
      suggestedValueId: homeValue.id
    }
  })

  await prisma.propertyValue.create({
    data: {
      propertyId: buttonNameProp.id,
      suggestedValueId: loginValue.id
    }
  })
  console.log('✅ Created property associations')

  // Create events
  await prisma.event.create({
    data: {
      pageId: homepage.id,
      name: 'page_view',
      status: 'VALIDATED',
      properties: JSON.stringify({ page_name: 'Homepage' })
    }
  })

  await prisma.event.create({
    data: {
      pageId: homepage.id,
      name: 'cta_click',
      status: 'TO_TEST',
      properties: JSON.stringify({ button_name: 'Login' })
    }
  })

  await prisma.event.create({
    data: {
      pageId: loginPage.id,
      name: 'login_attempt',
      status: 'TO_IMPLEMENT',
      properties: JSON.stringify({ page_name: 'Login' })
    }
  })

  await prisma.event.create({
    data: {
      pageId: dashboard.id,
      name: 'dashboard_view',
      status: 'VALIDATED',
      properties: JSON.stringify({})
    }
  })

  await prisma.event.create({
    data: {
      pageId: dashboard.id,
      name: 'appointment_book',
      status: 'ERROR',
      properties: JSON.stringify({ action: 'book' })
    }
  })
  console.log('✅ Created 5 events across all pages')

  console.log('🎉 Database seeded successfully!')
  console.log('📊 Summary:')
  console.log('   - 2 products')
  console.log('   - 3 pages')
  console.log('   - 5 events')
  console.log('   - 2 properties')
  console.log('   - 3 suggested values')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })