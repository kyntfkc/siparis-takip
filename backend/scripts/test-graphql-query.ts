/**
 * GraphQL Query Test Script
 * 
 * Bu script GraphQL query'lerini test etmek için kullanılır.
 * Kullanım: npm run test:graphql
 */

import axios from 'axios';

const IKAS_API_BASE_URL = process.env.IKAS_API_BASE_URL || 'https://api.myikas.com';
const IKAS_CLIENT_ID = process.env.IKAS_CLIENT_ID;
const IKAS_CLIENT_SECRET = process.env.IKAS_CLIENT_SECRET;

async function getToken(): Promise<string | null> {
  if (!IKAS_CLIENT_ID || !IKAS_CLIENT_SECRET) {
    console.error('❌ IKAS_CLIENT_ID ve IKAS_CLIENT_SECRET environment variables gerekli');
    return null;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', IKAS_CLIENT_ID);
  params.append('client_secret', IKAS_CLIENT_SECRET);

  try {
    const response = await axios.post(
      `${IKAS_API_BASE_URL}/api/admin/oauth/token`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data?.access_token || null;
  } catch (error: any) {
    console.error('❌ Token alınamadı:', error.message);
    return null;
  }
}

async function testGraphQLQuery(query: string, variables: any) {
  const token = await getToken();
  if (!token) {
    console.error('❌ Token alınamadı, test edilemiyor');
    return;
  }

  const graphqlUrl = `${IKAS_API_BASE_URL}/api/v1/admin/graphql`;

  try {
    const response = await axios.post(
      graphqlUrl,
      { query, variables },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.errors) {
      console.error('❌ GraphQL Hataları:');
      response.data.errors.forEach((error: any) => {
        console.error(`  - ${error.message}`);
        if (error.locations) {
          console.error(`    Satır: ${error.locations[0]?.line}, Sütun: ${error.locations[0]?.column}`);
        }
      });
      return false;
    }

    console.log('✅ GraphQL Query başarılı!');
    return true;
  } catch (error: any) {
    console.error('❌ GraphQL Test hatası:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test query'si
const testQuery = `
  query listOrder($orderedAt: DateFilterInput, $pagination: PaginationInput) {
    listOrder(orderedAt: $orderedAt, pagination: $pagination) {
      count
      data {
        id
        orderNumber
        orderLineItems {
          id
          options {
            name
            type
            values {
              value
            }
          }
        }
      }
    }
  }
`;

const testVariables = {
  orderedAt: {
    gte: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lte: Date.now()
  },
  pagination: {
    page: 1,
    limit: 1
  }
};

// Script çalıştırıldığında test et
if (require.main === module) {
  testGraphQLQuery(testQuery, testVariables)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test script hatası:', error);
      process.exit(1);
    });
}

export { testGraphQLQuery };

