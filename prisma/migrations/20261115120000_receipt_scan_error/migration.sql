-- Receipt images are not stored (#9): drop the unused receiptUrl column and record scan failures.
ALTER TABLE "Expense" DROP COLUMN "receiptUrl",
ADD COLUMN "scanError" TEXT;
