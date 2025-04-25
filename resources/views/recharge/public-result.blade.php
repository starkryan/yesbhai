<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Result - YesBhai</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding-top: 50px;
        }
        .result-card {
            max-width: 550px;
            margin: 0 auto;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-radius: 15px;
            overflow: hidden;
        }
        .header {
            padding: 20px;
            text-align: center;
            color: white;
        }
        .header-success {
            background-color: #28a745;
        }
        .header-error {
            background-color: #dc3545;
        }
        .header-failed {
            background-color: #ffc107;
        }
        .content {
            padding: 25px;
            background-color: white;
        }
        .amount {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .details {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .btn-primary {
            background-color: #4A1D96;
            border-color: #4A1D96;
            padding: 10px 30px;
            font-weight: 600;
        }
        .btn-primary:hover {
            background-color: #3c1878;
            border-color: #3c1878;
        }
        .logo {
            height: 40px;
            margin-bottom: 10px;
        }
        .success-icon {
            font-size: 80px;
            color: #28a745;
            text-align: center;
            margin-bottom: 20px;
        }
        .error-icon {
            font-size: 80px;
            color: #dc3545;
            text-align: center;
            margin-bottom: 20px;
        }
        .warning-icon {
            font-size: 80px;
            color: #ffc107;
            text-align: center;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="row">
            <div class="col-md-12">
                <div class="result-card">
                    <div class="header {{ $status === 'success' ? 'header-success' : ($status === 'failed' ? 'header-failed' : 'header-error') }}">
                        <img src="{{ asset('images/logo.png') }}" alt="YesBhai" class="logo">
                        <h3>Payment {{ ucfirst($status) }}</h3>
                    </div>
                    <div class="content">
                        @if($status === 'success')
                            <div class="success-icon">✓</div>
                            <h4 class="text-center mb-4">Your wallet has been recharged successfully!</h4>
                            
                            @if($amount)
                                <div class="amount">₹{{ number_format($amount, 2) }}</div>
                            @endif
                            
                            @if($rechargeDetails)
                                <div class="details">
                                    <div class="row mb-2">
                                        <div class="col-6 text-muted">Transaction ID:</div>
                                        <div class="col-6 text-end fw-bold">{{ $rechargeDetails['transaction_id'] ?? 'N/A' }}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6 text-muted">Order ID:</div>
                                        <div class="col-6 text-end">{{ $orderId }}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6 text-muted">Date:</div>
                                        <div class="col-6 text-end">{{ $rechargeDetails['created_at'] }}</div>
                                    </div>
                                </div>
                            @endif
                        @elseif($status === 'failed')
                            <div class="warning-icon">!</div>
                            <h4 class="text-center mb-4">Payment Failed</h4>
                            <p class="text-center mb-4">{{ $message ?? 'Your payment was not successful. Please try again or contact support if you need assistance.' }}</p>
                            
                            @if($orderId)
                                <div class="details">
                                    <div class="row mb-2">
                                        <div class="col-6 text-muted">Order ID:</div>
                                        <div class="col-6 text-end">{{ $orderId }}</div>
                                    </div>
                                </div>
                            @endif
                        @else
                            <div class="error-icon">×</div>
                            <h4 class="text-center mb-4">Error Processing Payment</h4>
                            <p class="text-center mb-4">{{ $message ?? 'There was an error processing your payment. Please contact our support team.' }}</p>
                            
                            @if($orderId)
                                <div class="details">
                                    <div class="row mb-2">
                                        <div class="col-6 text-muted">Reference:</div>
                                        <div class="col-6 text-end">{{ $orderId }}</div>
                                    </div>
                                </div>
                            @endif
                        @endif
                        
                        <div class="text-center mt-4">
                            <a href="{{ route('dashboard') }}" class="btn btn-primary">Back to Dashboard</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html> 