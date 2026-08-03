-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `credit_balance` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `credit_transactions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `type` ENUM('COMPRA', 'BONUS', 'AJUSTE', 'CONSUMO', 'ESTORNO') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `description` VARCHAR(250) NULL,
    `campaign_id` CHAR(36) NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_transactions_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `credit_transactions_tenant_id_type_idx`(`tenant_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
