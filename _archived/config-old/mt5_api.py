"""
MetaTrader 5 Python API Server
Connecte MT5 à votre site via une API Flask
"""

import MetaTrader5 as mt5
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import logging

app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global connection state
mt5_connected = False
account_info = None

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'Python API running',
        'mt5_connected': mt5_connected,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/mt5/connect', methods=['POST'])
def connect_mt5():
    """
    Connecter à MetaTrader 5
    Nécessite que MT5 soit ouvert avec le compte Vantage connecté
    """
    global mt5_connected, account_info
    
    try:
        # Initialiser MT5
        if not mt5.initialize():
            return jsonify({
                'error': 'Failed to initialize MT5. Ensure MetaTrader 5 is open.',
                'details': mt5.last_error()
            }), 500
        
        # Récupérer info compte
        account_info = mt5.account_info()
        if account_info is None:
            return jsonify({
                'error': 'No account connected in MT5',
                'details': 'Ouvrez MetaTrader 5 et connectez-vous à Vantage'
            }), 401
        
        mt5_connected = True
        
        return jsonify({
            'success': True,
            'message': 'Connected to MT5',
            'account': {
                'login': account_info.login,
                'server': account_info.server,
                'currency': account_info.currency,
                'balance': float(account_info.balance),
                'equity': float(account_info.equity),
            }
        })
    
    except Exception as e:
        logger.error(f"MT5 connection error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/disconnect', methods=['POST'])
def disconnect_mt5():
    """Déconnecter de MT5"""
    global mt5_connected
    try:
        mt5.shutdown()
        mt5_connected = False
        return jsonify({'success': True, 'message': 'Disconnected from MT5'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/account', methods=['GET'])
def get_account():
    """Récupérer les infos du compte"""
    if not mt5_connected:
        return jsonify({'error': 'Not connected to MT5'}), 401
    
    try:
        info = mt5.account_info()
        return jsonify({
            'login': info.login,
            'server': info.server,
            'currency': info.currency,
            'balance': float(info.balance),
            'equity': float(info.equity),
            'margin': float(info.margin),
            'margin_free': float(info.margin_free),
            'margin_level': float(info.margin_level) if info.margin_level else 0,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/trades', methods=['GET'])
def get_trades():
    """Récupérer tous les trades"""
    if not mt5_connected:
        return jsonify({'error': 'Not connected to MT5'}), 401
    
    try:
        # Récupérer les trades fermés
        deals = mt5.history_deals_get(0, datetime.now())
        
        if deals is None:
            return jsonify([])
        
        trades = []
        for deal in deals:
            if deal.type in [mt5.DEAL_BUY, mt5.DEAL_SELL]:  # Seulement trades
                trade = {
                    'id': deal.ticket,
                    'symbol': deal.symbol,
                    'direction': 'Long' if deal.type == mt5.DEAL_BUY else 'Short',
                    'volume': float(deal.volume),
                    'entry_price': float(deal.price),
                    'entry_time': datetime.fromtimestamp(deal.time).isoformat(),
                    'pnl': float(deal.profit),
                    'commission': float(deal.commission),
                    'type': 'buy' if deal.type == mt5.DEAL_BUY else 'sell',
                }
                trades.append(trade)
        
        return jsonify(trades)
    except Exception as e:
        logger.error(f"Error fetching trades: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/positions', methods=['GET'])
def get_positions():
    """Récupérer les positions ouvertes"""
    if not mt5_connected:
        return jsonify({'error': 'Not connected to MT5'}), 401
    
    try:
        positions = mt5.positions_get()
        
        if positions is None:
            return jsonify([])
        
        pos_list = []
        for pos in positions:
            position = {
                'ticket': pos.ticket,
                'symbol': pos.symbol,
                'direction': 'Long' if pos.type == 0 else 'Short',
                'volume': float(pos.volume),
                'entry_price': float(pos.price_open),
                'current_price': float(pos.price_current),
                'pnl': float(pos.profit),
                'pnl_pct': float((pos.profit / (pos.price_open * pos.volume)) * 100) if pos.price_open != 0 else 0,
            }
            pos_list.append(position)
        
        return jsonify(pos_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/symbols', methods=['GET'])
def get_symbols():
    """Récupérer les symboles disponibles"""
    if not mt5_connected:
        return jsonify({'error': 'Not connected to MT5'}), 401
    
    try:
        # Récupérer les symboles majeurs
        major_symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD']
        symbols = []
        
        for symbol in major_symbols:
            info = mt5.symbol_info(symbol)
            if info:
                symbols.append({
                    'name': info.name,
                    'bid': float(info.bid),
                    'ask': float(info.ask),
                    'spread': float(info.ask - info.bid),
                })
        
        return jsonify(symbols)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/stats', methods=['GET'])
def get_stats():
    """Récupérer les statistiques de trading"""
    if not mt5_connected:
        return jsonify({'error': 'Not connected to MT5'}), 401
    
    try:
        deals = mt5.history_deals_get(0, datetime.now())
        
        if not deals:
            return jsonify({
                'total_trades': 0,
                'wins': 0,
                'losses': 0,
                'win_rate': 0,
                'total_pnl': 0,
            })
        
        wins = sum(1 for d in deals if d.profit > 0)
        losses = sum(1 for d in deals if d.profit < 0)
        total_pnl = sum(d.profit for d in deals)
        
        return jsonify({
            'total_trades': len(deals),
            'wins': wins,
            'losses': losses,
            'win_rate': (wins / len(deals) * 100) if deals else 0,
            'total_pnl': float(total_pnl),
            'avg_win': float(sum(d.profit for d in deals if d.profit > 0) / wins) if wins > 0 else 0,
            'avg_loss': float(sum(d.profit for d in deals if d.profit < 0) / losses) if losses > 0 else 0,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info('Starting MetaTrader 5 API Server on port 5001')
    app.run(host='localhost', port=5001, debug=False)
