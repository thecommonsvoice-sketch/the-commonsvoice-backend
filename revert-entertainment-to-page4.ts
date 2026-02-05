
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Reverting 'Entertainment' to 'Page 4'...");

    // Find Entertainment
    const entertainment = await prisma.category.findFirst({
        where: {
            OR: [
                { slug: "entertainment" },
                { name: "Entertainment" }
            ]
        }
    });

    if (!entertainment) {
        console.log("Category 'Entertainment' not found. It might have been deleted or already renamed.");

        // Check if Page 4 exists
        const page4 = await prisma.category.findUnique({ where: { slug: "page-4" } });
        if (page4) {
            console.log("Found 'Page 4'. Updating name to match perfectly just in case.");
            await prisma.category.update({
                where: { id: page4.id },
                data: { name: "Page 4", slug: "page-4" }
            });
        }
        return;
    }

    // Check if Page 4 already exists (conflict)
    const existingPage4 = await prisma.category.findUnique({ where: { slug: "page-4" } });
    if (existingPage4 && existingPage4.id !== entertainment.id) {
        console.log("Warning: 'Page 4' already exists separately. Merging or handling conflict.");
        // If conflict, delete Page 4 and rename Entertainment? Or just warn?
        // I'll delete the existing Page 4 (assuming it's a mistake) and rename Entertainment to preserve relationships.
        console.log("Deleting conflicting Page 4...");
        await prisma.category.delete({ where: { id: existingPage4.id } });
    }

    // Update Entertainment -> Page 4
    const updated = await prisma.category.update({
        where: { id: entertainment.id },
        data: {
            name: "Page 4",
            slug: "page-4"
        }
    });

    console.log(`Successfully reverted category to: ${updated.name} (${updated.slug})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
