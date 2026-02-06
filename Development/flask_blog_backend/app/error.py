# app.error.py
import os
import logging
from flask import Blueprint, request, jsonify
from logging.handlers import RotatingFileHandler


bp = Blueprint('errors', __name__)
logger = logging.getLogger(__name__)


# Setup logging to logs/app.log
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'logs')
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, 'app.log')

file_handler = RotatingFileHandler(log_path, maxBytes=10240, backupCount=5)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.WARNING)

logger = logging.getLogger('flask_app_errors')
logger.setLevel(logging.WARNING)
logger.addHandler(file_handler)

# Error Handlers
@bp.app_errorhandler(400)
def handle_400(e):
    logger.warning(f"400 Bad Request: {request.method} {request.path}")
    return jsonify({'error': 'Bad Request'}), 400

@bp.app_errorhandler(401)
def handle_401(e):
    logger.warning(f"401 Unauthorized: {request.method} {request.path}")
    return jsonify({'error': 'Unauthorized'}), 401

@bp.app_errorhandler(403)
def handle_403(e):
    logger.warning(f"403 Forbidden: {request.method} {request.path}")
    return jsonify({'error': 'Forbidden'}), 403

@bp.app_errorhandler(404)
def handle_404(e):
    logger.warning(f"404 Not Found: {request.method} {request.path}")
    return jsonify({'error': 'Not Found', 'path': request.path}), 404

@bp.app_errorhandler(500)
def handle_500(e):
    logger.error(f"500 Internal Server Error: {request.method} {request.path}", exc_info=True)
    return jsonify({'error': 'Internal Server Error'}), 500



