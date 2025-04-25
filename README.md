# yesbhai

## Wallet System

The application includes a comprehensive wallet system with the following features:

### Wallet Recharge
- Users can recharge their wallet with amounts between ₹1 and ₹10,000
- Secure payment processing through integrated payment gateway
- Real-time wallet balance updates after successful payments
- Predefined quick-selection amounts for convenience

### Wallet Transactions
- View complete transaction history with dates and status
- Track all wallet recharges with order IDs and transaction IDs
- Filter by transaction status (Completed, Pending, Failed)
- Quick access to current wallet balance

## Usage

### Recharging Wallet
1. Navigate to the Recharge page from the sidebar
2. Enter desired amount or select from predefined options
3. Click "Proceed to Payment" to be redirected to payment gateway
4. Complete the payment process
5. Your wallet will be updated immediately after successful payment

### Viewing Transactions
1. Access wallet transactions from the sidebar menu
2. View your current wallet balance at the top of the page
3. Browse your complete transaction history
4. Check transaction status and details

## Developer Notes

### Payment Gateway Integration
- The callback URL (`/recharge/callback`) is configured to be accessible outside of auth middleware
- This is necessary as payment gateways need to access this endpoint without CSRF tokens
- For security, the callback handler verifies the payment using the gateway's API
- User identification is done through the order_id parameter in the callback
