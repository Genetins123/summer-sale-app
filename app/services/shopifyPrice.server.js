import shopify from "../shopify.server";

export async function getOfflineGraphqlClient(shop) {
  try {
    const { admin } = await shopify.unauthenticated.admin(shop);
    return admin;
  } catch (error) {
    throw new Error(`Failed to load offline session for shop: ${shop}. Error: ${error.message}`);
  }
}

export async function applyVariantPrice(admin, productId, variantId, newPrice) {
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      productId: productId,
      variants: [
        {
          id: variantId,
          price: newPrice.toString()
        }
      ]
    }
  });

  const responseJson = await response.json();

  if (responseJson.errors) {
    throw new Error(responseJson.errors.map(e => e.message).join(", "));
  }

  if (responseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
    throw new Error(responseJson.data.productVariantsBulkUpdate.userErrors.map(e => e.message).join(", "));
  }

  return true;
}

export async function restoreVariantPrice(admin, productId, variantId, originalPrice) {
  return applyVariantPrice(admin, productId, variantId, originalPrice);
}
