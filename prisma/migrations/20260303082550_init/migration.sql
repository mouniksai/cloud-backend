-- CreateTable
CREATE TABLE "govt_registry" (
    "citizen_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "constituency" TEXT NOT NULL DEFAULT 'General',
    "ward" TEXT NOT NULL DEFAULT 'Ward A',
    "dob" DATE NOT NULL,
    "gender" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_registered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "govt_registry_pkey" PRIMARY KEY ("citizen_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'voter',
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "citizen_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "govt_registry_citizen_id_key" ON "govt_registry"("citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "govt_registry_email_key" ON "govt_registry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "govt_registry_mobile_key" ON "govt_registry"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_citizen_id_key" ON "users"("citizen_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "govt_registry"("citizen_id") ON DELETE RESTRICT ON UPDATE CASCADE;
