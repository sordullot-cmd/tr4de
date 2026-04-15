# ApexTrader - Broker Integration Guide

## Architecture

- **Frontend**: Next.js React App (port 3000)
- **Backend**: Express.js API Server (port 5000)
- **Broker**: Tradovate Futures Trading Platform

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Tradovate API Credentials

1. Log in to [Tradovate](https://tradovate.com)
2. Go to **Account → API Settings**
3. Click **Generate New API Credentials**
4. Copy your:
   - **API Key** (username)
   - **API Secret** (password)
   - **Account ID** (numeric)

### 3. Configure Environment Variables

Edit `.env.local` and fill in your credentials:

```env
TRADOVATE_API_KEY=your_api_key_here
TRADOVATE_API_SECRET=your_api_secret_here
TRADOVATE_ACCOUNT_ID=your_account_id_here
TRADOVATE_API_URL=https://api.tradovate.com
```

### 4. Start Development

The dev script automatically starts both the Next.js frontend and Express backend:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Usage

### Connecting to Tradovate

1. Open the app at http://localhost:3000
2. Click **"⚡ Connect Broker"** button in the top right
3. Enter your Tradovate credentials:
   - API Key
   - API Secret
   - Account ID
4. Click **Connect**

Once connected, the dashboard will fetch and display your real trades instead of mock data.

### API Endpoints

#### Authentication
- `POST /api/auth/connect` - Connect to broker
- `POST /api/auth/disconnect` - Disconnect from broker
- `GET /api/auth/status` - Check connection status

#### Brokers
- `GET /api/brokers` - List available brokers
- `GET /api/brokers/tradovate/accounts` - Get accounts
- `GET /api/brokers/tradovate/trades` - Get real trades (requires connection)
- `GET /api/brokers/tradovate/positions` - Get open positions

## Security Notes

⚠️ **Important**: 
- Never commit `.env.local` to version control (keep credentials secret)
- API credentials are validated server-side only
- Credentials are NOT stored in the browser
- Use environment variables for production deployment

## Troubleshooting

### "Failed to authenticate with Tradovate"
- Check your API Key and Secret are correct
- Verify Account ID is numeric
- Ensure your Tradovate account has API access enabled

### Backend not running
- Ensure port 5000 is not in use
- Check that Express dependencies were installed: `npm install`

### CORS errors
- Make sure backend is running on port 5000
- The frontend should run on http://localhost:3000 (not 3001)

## Adding More Brokers

To add support for another broker (Alpaca, Interactive Brokers, etc.):

1. Create a new file in `lib/brokers/[broker-name].js`
2. Implement client class similar to `tradovate.js`
3. Add routes to `lib/brokers/index.js`
4. Update the login modal with new broker option

Example structure already exists in `lib/brokers/tradovate.js` for reference.

## License

MIT
