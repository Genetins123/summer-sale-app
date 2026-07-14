import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useSubmit, useNavigation } from "react-router";
import { SaleBuilder } from "./SaleBuilder";

export function SaleEditorLayout({ 
  initialSaleName, 
  initialProducts, 
  initialStartAt,
  initialEndAt,
  isEditable,
  searchResults, 
  searchError, 
  isSearching, 
  searchQuery, 
  onSearch, 
  onPaginate 
}) {
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";

  const [saleName, setSaleName] = useState(initialSaleName || "");
  const [startAt, setStartAt] = useState(initialStartAt || "");
  const [endAt, setEndAt] = useState(initialEndAt || "");
  const [selectedProducts, setSelectedProducts] = useState(initialProducts || []);
  const [queryValue, setQueryValue] = useState(searchQuery || "");

  useEffect(() => { setQueryValue(searchQuery || ""); }, [searchQuery]);

  const handleSearchClick = () => onSearch(queryValue);
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearchClick(); };

  const handleAddProduct = (product) => {
    if (!isEditable) return;
    
    const variants = product.variants?.nodes || [];
    if (variants.length === 0) return;

    const newItems = [];
    let addedCount = 0;

    for (const variant of variants) {
      const exists = selectedProducts.find(p => p.variantId === variant.id);
      if (!exists) {
        const price = parseFloat(variant.price || 0);
        newItems.push({
          id: variant.id, 
          productId: product.id,
          variantId: variant.id,
          title: variants.length > 1 && variant.title && variant.title !== 'Default Title' 
            ? `${product.title} - ${variant.title}` 
            : product.title,
          sku: variant.sku || '-',
          originalPrice: price,
          salePrice: price,
          imageUrl: product.featuredImage?.url,
          imageAlt: product.featuredImage?.altText || product.title,
        });
        addedCount++;
      }
    }

    if (addedCount === 0) {
      shopify.toast.show("All variants of this product are already in the sale", { isError: true });
      return;
    }

    setSelectedProducts(prev => [...prev, ...newItems]);
    shopify.toast.show(`Added ${addedCount} variant(s) to sale`);
  };

  const handleUpdateSalePrice = (id, newPrice) => {
    if (!isEditable) return;
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, salePrice: newPrice } : p));
  };

  const handleRemoveProduct = (id) => {
    if (!isEditable) return;
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveSale = () => {
    if (!saleName.trim()) {
      shopify.toast.show("Sale name is required", { isError: true });
      return;
    }
    
    if (selectedProducts.length === 0) {
      shopify.toast.show("At least one product is required", { isError: true });
      return;
    }

    if ((startAt && !endAt) || (!startAt && endAt)) {
      shopify.toast.show("Both start and end dates are required if scheduling", { isError: true });
      return;
    }

    if (startAt && endAt) {
      const sDate = new Date(startAt);
      const eDate = new Date(endAt);
      if (eDate <= sDate) {
        shopify.toast.show("End date must be after start date", { isError: true });
        return;
      }
    }
    
    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("saleName", saleName);
    if (startAt) formData.append("startAt", new Date(startAt).toISOString());
    if (endAt) formData.append("endAt", new Date(endAt).toISOString());
    formData.append("products", JSON.stringify(selectedProducts));
    
    submit(formData, { method: "POST" });
  };

  const nodes = searchResults?.nodes || [];
  const pageInfo = searchResults?.pageInfo || {};

  const saveButtonLabel = (startAt && endAt) ? "Save & Schedule" : "Save Draft";

  return (
    <s-page heading={initialSaleName ? "Edit Sale" : "Create New Sale"}>
      {isEditable && (
        <s-button slot="primary-action" onClick={handleSaveSale} disabled={isSaving}>
          {isSaving ? "Saving..." : saveButtonLabel}
        </s-button>
      )}

      {!isEditable && (
        <s-box padding="base" background="bg-surface-warning" borderRadius="base" marginBottom="base">
          <s-text color="warning">This sale is currently running or completed. Editing is disabled.</s-text>
        </s-box>
      )}

      <s-section heading="Sale Details">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '500' }}>Sale Name</label>
              <input 
                type="text" 
                value={saleName}
                onChange={(e) => setSaleName(e.target.value)}
                placeholder="e.g. Summer Blowout 2026"
                disabled={!isEditable}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontWeight: '500' }}>Start Date & Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  disabled={!isEditable}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontWeight: '500' }}>End Date & Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  disabled={!isEditable}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
            {(startAt || endAt) && (
              <s-text tone="subdued">Note: This sale will automatically start and end at the selected times.</s-text>
            )}
          </div>
        </s-box>
      </s-section>

      <s-section heading="Sale Builder">
        <SaleBuilder 
          products={selectedProducts} 
          onUpdateProduct={handleUpdateSalePrice} 
          onRemoveProduct={handleRemoveProduct} 
        />
      </s-section>

      {isEditable && (
        <s-section heading="Search Products to Add">
          <s-stack direction="inline" gap="base">
            <input 
              type="text" 
              placeholder="Search products by title or SKU" 
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }} 
              disabled={isSearching}
            />
            <s-button onClick={handleSearchClick} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </s-button>
          </s-stack>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
              <thead>
                <tr style={{ background: '#f4f6f8' }}>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Image</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Product</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>SKU</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Current Price</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isSearching && nodes.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}><s-text>Loading...</s-text></td></tr>
                ) : !searchError && nodes.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}><s-text>No products found.</s-text></td></tr>
                ) : (
                  nodes.map((product) => {
                    const variant = product.variants?.nodes?.[0];
                    const imageUrl = product.featuredImage?.url;
                    
                    return (
                      <tr key={product.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                        <td style={{ padding: '12px 8px' }}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={product.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', background: '#e1e3e5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#6d7175' }}>No img</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}><s-text>{product.title}</s-text></td>
                        <td style={{ padding: '12px 8px' }}><s-text>{variant?.sku || '-'}</s-text></td>
                        <td style={{ padding: '12px 8px' }}><s-text>{variant?.price ? `$${variant.price}` : '-'}</s-text></td>
                        <td style={{ padding: '12px 8px' }}>
                          <s-button onClick={() => handleAddProduct(product)} disabled={isSearching}>Add to Sale</s-button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!isSearching && nodes.length > 0 && (pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <s-stack direction="inline" gap="base">
                <s-button disabled={!pageInfo.hasPreviousPage} onClick={() => onPaginate(pageInfo.startCursor, 'prev')}>Previous</s-button>
                <s-button disabled={!pageInfo.hasNextPage} onClick={() => onPaginate(pageInfo.endCursor, 'next')}>Next</s-button>
              </s-stack>
            </div>
          )}
        </s-section>
      )}
    </s-page>
  );
}
