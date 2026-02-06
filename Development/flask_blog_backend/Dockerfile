# Use Python slim for a smaller image size
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Updated install command for Debian Trixie/Testing compatibility
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy project files
COPY . .

# Create directories for volumes
RUN mkdir -p /app/uploads /app/logs

EXPOSE 5000

# Ensure the module name matches your entry file 'run.py'
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app", "--workers", "4", "--access-logfile", "/app/logs/access.log"]