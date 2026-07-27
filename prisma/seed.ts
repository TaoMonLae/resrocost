import {
  AlertSeverity,
  AlertType,
  ChannelType,
  ExpenseType,
  InventoryTransactionType,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RecurrenceType,
  type Recipe,
  Role,
  Unit,
  WasteReason,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

const ingredientSeed = [
  ["Chicken thigh", "Meat", Unit.GRAM, 0.018, 22_000],
  ["Beef brisket", "Meat", Unit.GRAM, 0.034, 14_000],
  ["Prawns", "Seafood", Unit.GRAM, 0.042, 7_500],
  ["Salmon fillet", "Seafood", Unit.GRAM, 0.055, 6_000],
  ["Tomato", "Vegetables", Unit.GRAM, 0.006, 12_000],
  ["Onion", "Vegetables", Unit.GRAM, 0.004, 16_000],
  ["Garlic", "Vegetables", Unit.GRAM, 0.012, 4_000],
  ["Potato", "Vegetables", Unit.GRAM, 0.0035, 20_000],
  ["Mushroom", "Vegetables", Unit.GRAM, 0.014, 5_000],
  ["Baby spinach", "Vegetables", Unit.GRAM, 0.019, 3_000],
  ["Jasmine rice", "Dry goods", Unit.GRAM, 0.0048, 30_000],
  ["Pasta", "Dry goods", Unit.GRAM, 0.007, 10_000],
  ["Bread flour", "Dry goods", Unit.GRAM, 0.0038, 25_000],
  ["Sugar", "Dry goods", Unit.GRAM, 0.0032, 12_000],
  ["Sea salt", "Spices", Unit.GRAM, 0.002, 5_000],
  ["Black pepper", "Spices", Unit.GRAM, 0.048, 1_500],
  ["Paprika", "Spices", Unit.GRAM, 0.036, 1_200],
  ["Cooking oil", "Dry goods", Unit.MILLILITER, 0.0065, 18_000],
  ["Butter", "Dairy", Unit.GRAM, 0.029, 5_000],
  ["Heavy cream", "Dairy", Unit.MILLILITER, 0.018, 8_000],
  ["Parmesan", "Dairy", Unit.GRAM, 0.052, 3_500],
  ["Whole milk", "Dairy", Unit.MILLILITER, 0.008, 10_000],
  ["Egg", "Dairy", Unit.PIECE, 0.65, 240],
  ["Takeaway bowl", "Packaging", Unit.PIECE, 0.85, 350],
  ["Paper bag", "Packaging", Unit.PIECE, 0.3, 420],
] as const;

const recipeSeed = [
  ["Smoky chicken rice", [0, 10, 16], [220, 180, 4]],
  ["Beef mushroom pasta", [1, 8, 11], [180, 90, 160]],
  ["Garlic prawn rice", [2, 6, 10], [160, 12, 180]],
  ["Creamy salmon pasta", [3, 11, 19], [170, 150, 90]],
  ["Roasted vegetable bowl", [4, 7, 9], [120, 180, 80]],
  ["Chicken spinach pasta", [0, 9, 11], [180, 70, 150]],
  ["Brisket rice bowl", [1, 5, 10], [190, 60, 180]],
  ["Mushroom cream pasta", [8, 11, 19], [140, 160, 100]],
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed is disabled in production.");
  }

  const passwordHash = await bcrypt.hash("RestroCost123!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@restrocost.local" },
    update: { name: "Aisha Rahman", passwordHash },
    create: {
      name: "Aisha Rahman",
      email: "owner@restrocost.local",
      passwordHash,
    },
  });

  const existingRestaurant = await prisma.restaurant.findUnique({
    where: { slug: "ember-and-grain-demo" },
    select: { id: true },
  });

  if (existingRestaurant) {
    console.info("Development restaurant already exists; seed skipped.");
    return;
  }

  const otherUsers = await Promise.all(
    [
      ["manager@restrocost.local", "Daniel Lee", Role.MANAGER],
      ["kitchen@restrocost.local", "Maya Tan", Role.KITCHEN_STAFF],
      ["accounts@restrocost.local", "Noah Lim", Role.ACCOUNTANT],
    ].map(async ([email, name, role]) => ({
      role: role as Role,
      user: await prisma.user.upsert({
        where: { email: email as string },
        update: { name: name as string, passwordHash },
        create: {
          email: email as string,
          name: name as string,
          passwordHash,
        },
      }),
    })),
  );

  await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: "Ember & Grain",
        slug: "ember-and-grain-demo",
        currency: "MYR",
        country: "MY",
        timezone: "Asia/Kuala_Lumpur",
        taxRate: 6,
        pricesIncludeTax: true,
        defaultFoodCostPercent: 30,
        defaultProfitMargin: 40,
        monthlyFixedExpenses: 38_000,
        onboardingCompletedAt: new Date(),
      },
    });

    const branch = await tx.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: "Bangsar Main",
        code: "BGR01",
        timezone: "Asia/Kuala_Lumpur",
      },
    });

    await tx.restaurantMember.createMany({
      data: [
        {
          restaurantId: restaurant.id,
          userId: owner.id,
          role: Role.OWNER,
        },
        ...otherUsers.map(({ user, role }) => ({
          restaurantId: restaurant.id,
          userId: user.id,
          role,
        })),
      ],
    });

    const supplierNames = [
      "FreshFields Produce",
      "Selangor Protein Co.",
      "Blue Harbour Seafood",
      "Pantry Direct",
      "PackRight Supplies",
    ];
    const suppliers = await Promise.all(
      supplierNames.map((name, index) =>
        tx.supplier.create({
          data: {
            restaurantId: restaurant.id,
            name,
            contactPerson: ["Amir", "Jia Wei", "Farah", "Kumar", "Elena"][index],
            email: `orders${index + 1}@supplier.local`,
            paymentTerms: index % 2 ? "Net 14" : "Net 30",
          },
        }),
      ),
    );

    const categoryNames = [...new Set(ingredientSeed.map((item) => item[1]))];
    const categories = await Promise.all(
      categoryNames.map((name) =>
        tx.ingredientCategory.create({
          data: { restaurantId: restaurant.id, name },
        }),
      ),
    );
    const categoryByName = new Map(categories.map((item) => [item.name, item.id]));

    const ingredients = await Promise.all(
      ingredientSeed.map(([name, category, unit, cost, stock], index) =>
        tx.ingredient.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: categoryByName.get(category),
            preferredSupplierId:
              suppliers[
                category === "Packaging"
                  ? 4
                  : category === "Seafood"
                    ? 2
                    : category === "Meat"
                      ? 1
                      : index % 2
                        ? 0
                        : 3
              ].id,
            name,
            sku: `ING-${String(index + 1).padStart(3, "0")}`,
            baseUnit: unit,
            purchaseUnit: unit,
            currentStock: stock,
            minimumStock: Math.round(stock * 0.2),
            reorderQuantity: Math.round(stock * 0.5),
            currentCostPerBaseUnit: cost,
            wastePercentage:
              category === "Vegetables" ? 8 : category === "Meat" ? 5 : 0,
            usableYieldPercentage:
              category === "Vegetables" ? 92 : category === "Meat" ? 95 : 100,
            expiryTrackingEnabled: ["Meat", "Seafood", "Dairy"].includes(category),
          },
        }),
      ),
    );

    await tx.inventoryTransaction.createMany({
      data: ingredients.map((ingredient, index) => ({
        restaurantId: restaurant.id,
        branchId: branch.id,
        ingredientId: ingredient.id,
        createdById: owner.id,
        type: InventoryTransactionType.OPENING_BALANCE,
        quantity: ingredientSeed[index][4],
        unit: ingredientSeed[index][2],
        baseQuantity: ingredientSeed[index][4],
        unitCost: ingredientSeed[index][3],
        totalCost: new Prisma.Decimal(ingredientSeed[index][4]).mul(
          ingredientSeed[index][3],
        ),
        notes: "Development opening balance",
        occurredAt: subDays(new Date(), 31),
      })),
    });

    const recipeCategory = await tx.recipeCategory.create({
      data: { restaurantId: restaurant.id, name: "Core menu" },
    });
    const recipes: Recipe[] = [];
    for (const [name, ingredientIndexes, quantities] of recipeSeed) {
      const batchCost = ingredientIndexes.reduce<number>(
        (sum, ingredientIndex, position) =>
          sum +
          ingredientSeed[ingredientIndex][3] * quantities[position],
        0,
      );
      const recipe = await tx.recipe.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: recipeCategory.id,
          name,
          batchYield: 1,
          yieldUnit: Unit.UNIT,
          numberOfServings: 1,
          wastePercentage: 3,
          currentBatchCost: batchCost * 1.03,
          currentCostPerServing: batchCost * 1.03,
        },
      });
      await tx.recipeIngredient.createMany({
        data: ingredientIndexes.map((ingredientIndex, position) => ({
          restaurantId: restaurant.id,
          recipeId: recipe.id,
          ingredientId: ingredients[ingredientIndex].id,
          type: "INGREDIENT",
          quantity: quantities[position],
          unit: ingredientSeed[ingredientIndex][2],
          convertedBaseQuantity: quantities[position],
          costSnapshot:
            ingredientSeed[ingredientIndex][3] * quantities[position],
          sortOrder: position,
        })),
      });
      recipes.push(recipe);
    }

    const menuCategory = await tx.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Kitchen favourites" },
    });
    const menuNames = [
      "Smoky chicken rice",
      "Beef mushroom pasta",
      "Garlic prawn rice",
      "Creamy salmon pasta",
      "Roasted vegetable bowl",
      "Chicken spinach pasta",
      "Brisket rice bowl",
      "Mushroom cream pasta",
      "Crispy chicken bowl",
      "Market vegetable pasta",
    ];
    const menuItems = await Promise.all(
      menuNames.map((name, index) => {
        const recipe = recipes[index % recipes.length];
        const foodCost = recipe.currentCostPerServing.toNumber();
        const fullCost = foodCost + 3.2;
        const price = Math.ceil((fullCost / 0.6) * 10) / 10;
        const profit = price - fullCost;
        return tx.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: menuCategory.id,
            recipeId: recipe.id,
            name,
            sku: `MENU-${String(index + 1).padStart(3, "0")}`,
            currentBaseSellingPrice: price,
            targetFoodCostPercentage: 30,
            targetProfitMargin: 40,
            packagingCost: 1.15,
            directLaborCost: 1.5,
            utilityCost: 0.55,
            currentFoodCost: foodCost,
            currentFullCost: fullCost,
            currentProfit: profit,
            currentProfitMargin: (profit / price) * 100,
            status: profit / price < 0.25 ? "LOW_MARGIN" : "ACCEPTABLE",
          },
        });
      }),
    );

    const channels = await Promise.all(
      [
        ["Dine-in", ChannelType.DINE_IN, 0],
        ["Takeaway", ChannelType.TAKEAWAY, 0],
        ["GrabFood", ChannelType.GRABFOOD, 28],
        ["Foodpanda", ChannelType.FOODPANDA, 30],
      ].map(([name, type, commission]) =>
        tx.salesChannel.create({
          data: {
            restaurantId: restaurant.id,
            name: name as string,
            type: type as ChannelType,
            commissionPercentage: commission as number,
            paymentProcessingPercentage: commission ? 2 : 0,
            packagingSurcharge: name === "Dine-in" ? 0 : 1.15,
          },
        }),
      ),
    );

    const expenseCategory = await tx.expenseCategory.create({
      data: { restaurantId: restaurant.id, name: "Rent" },
    });
    await tx.expense.create({
      data: {
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId: expenseCategory.id,
        payee: "Bangsar Property Holdings",
        expenseDate: new Date(),
        amount: 18_000,
        type: ExpenseType.FIXED,
        recurrence: RecurrenceType.RECURRING,
        recurringDay: 1,
        description: "Monthly restaurant rent",
      },
    });

    for (let day = 0; day < 30; day += 1) {
      const date = subDays(new Date(), day);
      const supplier = suppliers[day % suppliers.length];
      await tx.purchase.create({
        data: {
          restaurantId: restaurant.id,
          branchId: branch.id,
          supplierId: supplier.id,
          purchaseDate: date,
          invoiceNumber: `DEV-P-${String(day + 1).padStart(4, "0")}`,
          currency: "MYR",
          subtotal: 320 + (day % 5) * 42,
          tax: 0,
          total: 320 + (day % 5) * 42,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: "Bank transfer",
        },
      });

      const channel = channels[day % channels.length];
      const item = menuItems[day % menuItems.length];
      const quantity = 18 + (day % 9);
      const price = item.currentBaseSellingPrice.toNumber();
      const fullCost = item.currentFullCost.toNumber();
      const commission = (price * channel.commissionPercentage.toNumber()) / 100;
      const perItemProfit = price - fullCost - commission;
      const sale = await tx.sale.create({
        data: {
          restaurantId: restaurant.id,
          branchId: branch.id,
          salesChannelId: channel.id,
          soldAt: date,
          orderReference: `DEV-S-${String(day + 1).padStart(4, "0")}`,
          customerCount: quantity,
          subtotal: price * quantity,
          totalAmount: price * quantity,
          totalCost: fullCost * quantity,
          totalProfit: perItemProfit * quantity,
          paymentMethod: "Card",
        },
      });
      await tx.saleItem.create({
        data: {
          restaurantId: restaurant.id,
          saleId: sale.id,
          menuItemId: item.id,
          quantity,
          sellingPriceSnapshot: price,
          netSales: price * quantity,
          foodCostSnapshot: item.currentFoodCost,
          fullCostSnapshot: fullCost,
          channelCommissionSnapshot: commission,
          calculatedProfitSnapshot: perItemProfit * quantity,
          profitMarginSnapshot: (perItemProfit / price) * 100,
        },
      });
    }

    await tx.wasteRecord.create({
      data: {
        restaurantId: restaurant.id,
        branchId: branch.id,
        ingredientId: ingredients[4].id,
        recordedById: otherUsers[1].user.id,
        quantity: 1_200,
        unit: Unit.GRAM,
        cost: 7.2,
        reason: WasteReason.SPOILED,
        wasteDate: subDays(new Date(), 2),
        notes: "Temperature issue during receiving",
      },
    });

    await tx.alert.createMany({
      data: [
        {
          restaurantId: restaurant.id,
          type: AlertType.LOW_STOCK,
          severity: AlertSeverity.WARNING,
          title: "Baby spinach is nearing reorder level",
          description: "Current stock is within 10% of the configured minimum.",
          relatedEntity: "Ingredient",
          relatedEntityId: ingredients[9].id,
        },
        {
          restaurantId: restaurant.id,
          type: AlertType.PRICE_INCREASE,
          severity: AlertSeverity.INFO,
          title: "Salmon cost increased",
          description: "Latest unit cost is 7.8% above the previous purchase.",
          relatedEntity: "Ingredient",
          relatedEntityId: ingredients[3].id,
        },
      ],
    });
  });

  console.info("Development data created.");
  console.info("Sign in: owner@restrocost.local / RestroCost123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
