
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Renaming 'Page 4' to 'Sports and Entertainment'...");

    const targetName = "Sports and Entertainment";
    const targetSlug = "sports-and-entertainment";

    // Find Page 4
    const page4 = await prisma.category.findFirst({
        where: {
            OR: [
                { slug: "page-4" },
                { name: "Page 4" }
            ]
        }
    });

    if (!page4) {
        console.log("Category 'Page 4' not found. Checking if target already exists...");
    } else {
        console.log(`Found 'Page 4' (id: ${page4.id}). Updating...`);
    }

    // Check if target slug already exists
    const existingTarget = await prisma.category.findUnique({ where: { slug: targetSlug } });

    if (existingTarget) {
        if (page4 && existingTarget.id !== page4.id) {
            console.log(`Warning: Category '${targetName}' already exists separately (id: ${existingTarget.id}).`);
            console.log("Deleting 'Page 4' and keeping existing target category to avoid duplicates.");
            await prisma.category.delete({ where: { id: page4.id } });
            console.log("Deleted old Page 4.");
            return;
        } else {
            console.log("Target category already exists and matches Page 4 (or Page 4 missing). No action needed.");
        }
    } else {
        // Perform rename if Page 4 exists
        if (page4) {
            const updated = await prisma.category.update({
                where: { id: page4.id },
                data: {
                    name: targetName,
                    slug: targetSlug
                }
            });
            console.log(`Successfully renamed to: ${updated.name} (${updated.slug})`);
        } else {
            // If neither exists, should we create it?
            // User asked to "change Page 4 back", implying it exists.
            // If it doesn't, maybe we create it?
            console.log("Neither Page 4 nor target category found. Creating new category...");
            const newCat = await prisma.category.create({
                data: {
                    name: targetName,
                    slug: targetSlug,
                    isActive: true
                }
            });
            console.log(`Created new category: ${newCat.name}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
