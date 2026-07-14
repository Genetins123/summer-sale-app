import cron from "node-cron";
import prisma from "../db.server";
import { getOfflineGraphqlClient, applyVariantPrice, restoreVariantPrice } from "./shopifyPrice.server";

console.log("Scheduler initializing...");

cron.schedule("* * * * *", async () => {
  try {
    await processScheduledSales();
    await processRunningSales();
  } catch (error) {
    console.error("Scheduler encountered a critical error:", error);
  }
});

async function processScheduledSales() {
  const now = new Date();
  const scheduledSales = await prisma.sale.findMany({
    where: {
      status: "Scheduled",
      startAt: { lte: now }
    },
    include: { items: true }
  });

  for (const sale of scheduledSales) {
    console.log(`Starting scheduled sale: ${sale.name} (${sale.id})`);
    
    try {
      const client = await getOfflineGraphqlClient(sale.shop);
      let successCount = 0;

      for (const item of sale.items) {
        if (!item.variantId || !item.productId) continue;
        
        try {
          await applyVariantPrice(client, item.productId, item.variantId, item.salePrice);
          await prisma.saleItem.update({
            where: { id: item.id },
            data: { appliedAt: new Date() }
          });
          successCount++;
        } catch (itemError) {
          console.error(`Failed to apply sale price for variant ${item.variantId}:`, itemError.message || itemError);
        }
      }

      if (successCount > 0 || sale.items.length === 0) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Running" }
        });
        console.log(`Sale ${sale.name} is now RUNNING. Applied prices to ${successCount} items.`);
      } else {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Failed" }
        });
        console.log(`Sale ${sale.name} FAILED to start. Applied prices to 0 items.`);
      }

    } catch (saleError) {
      console.error(`Failed to start sale ${sale.name}:`, saleError.message || saleError);
      await prisma.sale.update({
        where: { id: sale.id },
        data: { status: "Failed" }
      });
    }
  }
}

async function processRunningSales() {
  const now = new Date();
  const runningSales = await prisma.sale.findMany({
    where: {
      status: "Running",
      endAt: { lte: now }
    },
    include: { items: true }
  });

  for (const sale of runningSales) {
    console.log(`Ending running sale: ${sale.name} (${sale.id})`);
    
    try {
      const client = await getOfflineGraphqlClient(sale.shop);
      let successCount = 0;

      for (const item of sale.items) {
        if (!item.variantId || !item.productId) continue;
        
        try {
          await restoreVariantPrice(client, item.productId, item.variantId, item.originalPrice);
          await prisma.saleItem.update({
            where: { id: item.id },
            data: { restoredAt: new Date() }
          });
          successCount++;
        } catch (itemError) {
          console.error(`Failed to restore price for variant ${item.variantId}:`, itemError.message || itemError);
        }
      }

      if (successCount > 0 || sale.items.length === 0) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Completed" }
        });
        console.log(`Sale ${sale.name} is now COMPLETED. Restored prices for ${successCount} items.`);
      } else {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Failed" }
        });
        console.log(`Sale ${sale.name} FAILED to end properly. Restored prices for 0 items.`);
      }

    } catch (saleError) {
      console.error(`Failed to end sale ${sale.name}:`, saleError.message || saleError);
      await prisma.sale.update({
        where: { id: sale.id },
        data: { status: "Failed" }
      });
    }
  }
}
