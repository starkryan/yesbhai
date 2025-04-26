#!/bin/bash
# Laravel Deployment Script for LEMP Stack

# Stop execution if any command fails
set -e

# Configuration
APP_PATH="/var/www/yesbhai"
WEB_USER="www-data"
WEB_GROUP="www-data"

echo "🚀 Starting deployment process..."

# Navigate to application directory
cd $APP_PATH

# Pull latest changes if using Git (uncomment if needed)
# echo "📥 Pulling latest changes..."
# git pull origin main

# Install/update PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-interaction --optimize-autoloader --no-dev

# Install/update JS dependencies and build
echo "🔨 Installing JS dependencies and building assets..."
npm ci
npm run build

# Set correct permissions
echo "🔒 Setting correct permissions..."
sudo chown -R $WEB_USER:$WEB_GROUP $APP_PATH/storage
sudo chmod -R 775 $APP_PATH/storage
sudo chown -R $WEB_USER:$WEB_GROUP $APP_PATH/bootstrap/cache
sudo chmod -R 775 $APP_PATH/bootstrap/cache
sudo chown -R $WEB_USER:$WEB_GROUP $APP_PATH/public
sudo chmod -R 755 $APP_PATH/public

# Clear Laravel caches
echo "🧹 Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run migrations if needed (uncomment if you want to run migrations on deploy)
# echo "🔄 Running database migrations..."
# php artisan migrate --force

# Restart services
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
echo "🔄 Restarting PHP-FPM..."
sudo systemctl restart php8.2-fpm  # Change version if needed

# Optionally clear OPcache
echo "🧹 Clearing OPcache..."
sudo -u $WEB_USER php -r "opcache_reset();"

echo "✅ Deployment completed successfully!"