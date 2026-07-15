import { useState } from "react";
import { useNavigate, useSubmit, useFetcher } from "react-router";

export function SalesLayout({ sales, initialQuery }) {
  const navigate = useNavigate();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [queryValue, setQueryValue] = useState(initialQuery || "");

  const handleSearch = () => {
    submit({ q: queryValue });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      fetcher.submit({ intent: "delete", id }, { method: "POST" });
    }
  };

  const draftSales = sales.filter(s => s.status === "Draft");
  const scheduledSales = sales.filter(s => s.status === "Scheduled");
  const runningSales = sales.filter(s => s.status === "Running");
  const completedSales = sales.filter(s => s.status === "Completed");
  const failedSales = sales.filter(s => s.status === "Failed");

  const renderSalesTable = (items, canEditDelete = false) => {
    if (items.length === 0) {
      return (
        <div style={{ marginTop: '16px' }}>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued" textAlign="center">
            <s-text>No sales found in this status.</s-text>
          </s-box>
        </div>
      );
    }

    return (
      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f4f6f8' }}>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Sale Name</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Products Count</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Start Date (UK)</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>End Date (UK)</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                <td style={{ padding: '12px 8px' }}><s-text>{sale.name}</s-text></td>
                <td style={{ padding: '12px 8px' }}><s-text>{sale._count.items}</s-text></td>
                <td style={{ padding: '12px 8px' }}>
                  <s-text>{sale.startAt ? new Date(sale.startAt).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) : "-"}</s-text>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <s-text>{sale.endAt ? new Date(sale.endAt).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) : "-"}</s-text>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: sale.status === 'Running' ? '#aee9d1' : '#e3e5e7' }}>
                    {sale.status}
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <s-stack direction="inline" gap="base">
                    {canEditDelete ? (
                      <>
                        <s-button onClick={() => navigate(`/app/sales/${sale.id}`)}>Edit</s-button>
                        <s-button tone="critical" onClick={() => handleDelete(sale.id)}>Delete</s-button>
                      </>
                    ) : (
                      <s-button onClick={() => navigate(`/app/sales/${sale.id}`)}>View Details</s-button>
                    )}
                  </s-stack>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <s-page heading="Sales">
      <s-button slot="primary-action" onClick={() => navigate('/app/sales/new')}>
        Create New Sale
      </s-button>

      <s-stack direction="block" gap="base">
        <s-box padding="base" background="bg-surface" borderRadius="base">
          <s-stack direction="inline" gap="base">
            <input 
              type="text" 
              placeholder="Search by sale name" 
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }} 
            />
            <s-button onClick={handleSearch}>Search</s-button>
          </s-stack>
        </s-box>

        <s-section heading="Running Sales">
          {renderSalesTable(runningSales, false)}
        </s-section>

        <s-section heading="Scheduled Sales">
          {renderSalesTable(scheduledSales, true)}
        </s-section>

        <s-section heading="Draft Sales">
          {renderSalesTable(draftSales, true)}
        </s-section>
        
        <s-section heading="Completed Sales">
          {renderSalesTable(completedSales, false)}
        </s-section>

        {failedSales.length > 0 && (
          <s-section heading="Failed Sales">
            {renderSalesTable(failedSales, false)}
          </s-section>
        )}
      </s-stack>
    </s-page>
  );
}
