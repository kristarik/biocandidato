-- AlterTable
ALTER TABLE `supporters` ADD COLUMN `opted_out_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `supporters_tenant_id_opted_out_at_idx` ON `supporters`(`tenant_id`, `opted_out_at`);
