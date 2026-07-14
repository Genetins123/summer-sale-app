import shopify from "../shopify.server";

export async function getOfflineGraphqlClient(shop) {
  try {
    const { admin } = await shopify.unauthenticated.admin(shop);
    return admin;
  } catch (error) {
    throw new Error(`Failed to load offline session for shop: ${shop}. Error: ${error.message}`);
  }
}

export async function applyVariantPrice(admin, variantId, newPrice) {
  const mutation = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
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
      input: {
        id: variantId,
        price: newPrice.toString()
      }
    }
  });

  const responseJson = await response.json();

  if (responseJson.data?.productVariantUpdate?.userErrors?.length > 0) {
    throw new Error(responseJson.data.productVariantUpdate.userErrors.map(e => e.message).join(", "));
  }

  return true;
}

export async function restoreVariantPrice(client, variantId, originalPrice) {
  return applyVariantPrice(client, variantId, originalPrice);
}
