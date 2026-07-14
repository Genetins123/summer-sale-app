import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts } from "../services/product.server";
import { updateSale, getSale } from "../services/sales.server";
import { SaleEditorLayout } from "../components/sales/SaleEditorLayout";
import { useLoaderData, useNavigation, useSubmit, redirect } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const sale = await getSale(params.id);
  
  if (!sale) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";

  try {
    const productsData = await searchProducts(admin, { query, cursor, direction });
    return { sale, searchResults: productsData, searchError: null, query };
  } catch (error) {
    return { sale, searchResults: null, searchError: error.message, query };
  }
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  if (formData.get("intent") === "save") {
    const saleName = formData.get("saleName");
    const startAt = formData.get("startAt");
    const endAt = formData.get("endAt");
    const products = JSON.parse(formData.get("products") || "[]");
    
    await updateSale(params.id, {
      name: saleName,
      startAt: startAt || null,
      endAt: endAt || null,
      items: products
    });
    
    return redirect("/app/sales");
  }
  return null;
};

export default function EditSalePage() {
  const { sale, searchResults, searchError, query } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  
  const isSearching = navigation.state === "loading" && !navigation.formData?.get("intent");

  const handleSearch = (newQuery) => {
    if (!newQuery) {
      submit({}, { replace: true });
    } else {
      submit({ q: newQuery }, { replace: true });
    }
  };

  const handlePaginate = (newCursor, dir) => {
    const params = {};
    if (query) params.q = query;
    if (newCursor) {
      params.cursor = newCursor;
      params.direction = dir;
    }
    submit(params);
  };

  const mappedProducts = sale.items.map(item => ({
    id: item.variantId || item.id,
    productId: item.productId,
    variantId: item.variantId,
    title: item.productTitle,
    sku: item.sku,
    originalPrice: item.originalPrice,
    salePrice: item.salePrice,
    imageUrl: item.imageUrl,
    imageAlt: item.productTitle
  }));

  const isEditable = sale.status === "Draft" || sale.status === "Scheduled";
  const formattedStart = sale.startAt ? new Date(sale.startAt).toISOString().slice(0, 16) : "";
  const formattedEnd = sale.endAt ? new Date(sale.endAt).toISOString().slice(0, 16) : "";

  return (
    <SaleEditorLayout 
      initialSaleName={sale.name}
      initialProducts={mappedProducts}
      initialStartAt={formattedStart}
      initialEndAt={formattedEnd}
      isEditable={isEditable}
      searchResults={searchResults}
      searchError={searchError}
      isSearching={isSearching}
      searchQuery={query}
      onSearch={handleSearch}
      onPaginate={handlePaginate}
    />
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
