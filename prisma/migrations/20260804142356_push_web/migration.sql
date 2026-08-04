-- DropIndex
DROP INDEX `push_tokens_token_key` ON `push_tokens`;

-- AlterTable
ALTER TABLE `push_tokens` ADD COLUMN `auth` VARCHAR(255) NULL,
    ADD COLUMN `p256dh` VARCHAR(255) NULL,
    MODIFY `token` VARCHAR(500) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `push_tokens_tenant_id_token_key` ON `push_tokens`(`tenant_id`, `token`(191));
