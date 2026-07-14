export async function searchProducts(admin, { query, cursor, direction = 'next', limit = 10 }) {
  const isNext = direction === 'next';
  const first = isNext ? limit : null;
  const last = isNext ? null : limit;
  const after = isNext && cursor ? cursor : null;
  const before = !isNext && cursor ? cursor : null;

  // Shopify query syntax allows matching title and sku.
  const searchQuery = query ? `title:*${query}* OR sku:*${query}*` : "";

  const graphqlQuery = `#graphql
    query SearchProducts($query: String, $first: Int, $last: Int, $after: String, $before: String) {
      products(first: $first, last: $last, after: $after, before: $before, query: $query) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          title
          status
          featuredImage {
            url
            altText
          }
          variants(first: 100) {
            nodes {
              id
              title
              sku
              price
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(graphqlQuery, {
      variables: {
        query: searchQuery,
        first,
        last,
        after,
        before
      }
    });

    const json = await response.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors[0]?.message || "GraphQL Error");
    }

    return json.data.products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    throw new Error(error.message || "Network failure");
  }
}
