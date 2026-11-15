-- Change counter for real-time updates (#11): bumped with every expense create, edit, delete or
-- confirm and every recorded settlement, so clients polling /version see edits and deletes too.
ALTER TABLE "Household" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
