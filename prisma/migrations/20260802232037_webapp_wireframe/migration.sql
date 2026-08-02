-- AlterTable
ALTER TABLE `proposals` ADD COLUMN `content` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `supporters` ADD COLUMN `status` ENUM('PENDENTE', 'CONFIRMADO', 'COMPLETO') NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN `verification_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `verification_expires_at` DATETIME(3) NULL,
    ADD COLUMN `verification_hash` CHAR(64) NULL,
    ADD COLUMN `verification_sent_at` DATETIME(3) NULL,
    MODIFY `name` VARCHAR(150) NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `banner_url` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `banners` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `slot` ENUM('TOPO', 'MEIO', 'RODAPE') NOT NULL DEFAULT 'MEIO',
    `image_url` VARCHAR(500) NOT NULL,
    `link_url` VARCHAR(500) NULL,
    `alt` VARCHAR(200) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `banners_tenant_id_slot_position_idx`(`tenant_id`, `slot`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_links` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `platform` VARCHAR(40) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_links_tenant_id_position_idx`(`tenant_id`, `position`),
    UNIQUE INDEX `social_links_tenant_id_platform_key`(`tenant_id`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `important_links` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `icon_url` VARCHAR(500) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `important_links_tenant_id_position_idx`(`tenant_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `supporters_tenant_id_status_idx` ON `supporters`(`tenant_id`, `status`);

-- AddForeignKey
ALTER TABLE `banners` ADD CONSTRAINT `banners_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_links` ADD CONSTRAINT `social_links_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `important_links` ADD CONSTRAINT `important_links_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
