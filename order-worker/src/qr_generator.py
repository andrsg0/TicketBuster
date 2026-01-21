"""
QR Code generation module with CPU simulation.
Generates QR codes for tickets and simulates heavy processing
based on processing_complexity for K8s autoscaling demos.
"""
import hashlib
import io
import logging
import time
from typing import Tuple

import qrcode
from PIL import Image

logger = logging.getLogger(__name__)


def generate_qr_code(
    order_uuid: str,
    user_id: str,
    event_id: int,
    seat_id: int,
    processing_complexity: int = 5
) -> Tuple[str, bytes, float]:
    """
    Generate QR code for a ticket with CPU-intensive simulation.
    
    The processing_complexity parameter (1-10) determines how much
    CPU work is done. This is used to demonstrate Kubernetes
    Horizontal Pod Autoscaler (HPA) scaling under load.
    
    Args:
        order_uuid: Order UUID for the ticket
        user_id: User UUID who purchased
        event_id: Event ID
        seat_id: Seat ID
        processing_complexity: 1-10, higher = more CPU work
        
    Returns:
        Tuple of (qr_hash, qr_image_bytes, processing_time_seconds)
    """
    start_time = time.time()
    
    # Create ticket data for QR code
    ticket_data = f"TICKET:{order_uuid}|USER:{user_id}|EVENT:{event_id}|SEAT:{seat_id}"
    
    # Generate base hash
    qr_hash = hashlib.sha256(ticket_data.encode()).hexdigest()[:32]
    
    # CPU-intensive work based on complexity (1-10)
    # This simulates real-world heavy processing like:
    # - Image processing
    # - Cryptographic operations
    # - Complex validations
    _simulate_cpu_load(processing_complexity, qr_hash)
    
    # Generate actual QR code image
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(ticket_data)
    qr.make(fit=True)
    
    # Create image
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_buffer = io.BytesIO()
    qr_image.save(img_buffer, format='PNG')
    qr_bytes = img_buffer.getvalue()
    
    processing_time = time.time() - start_time
    
    logger.info(
        f"Generated QR code: hash={qr_hash[:8]}..., "
        f"complexity={processing_complexity}, "
        f"time={processing_time:.3f}s, "
        f"size={len(qr_bytes)} bytes"
    )
    
    return qr_hash, qr_bytes, processing_time


def _simulate_cpu_load(complexity: int, seed: str):
    """
    Simulate CPU-intensive work based on complexity level.
    
    Complexity mapping:
    - 1-2: Light (~100ms)
    - 3-4: Medium (~500ms)
    - 5-6: Normal (~1s)
    - 7-8: Heavy (~2s)
    - 9-10: Very Heavy (~3-5s)
    
    This uses iterative hashing which is CPU-bound and
    creates measurable load for K8s autoscaling.
    """
    # Clamp complexity to 1-10
    complexity = max(1, min(10, complexity))
    
    # Calculate iterations based on complexity
    # Exponential scaling: more complexity = much more work
    base_iterations = 10000
    iterations = base_iterations * (2 ** (complexity - 1))
    
    # Cap at reasonable maximum
    iterations = min(iterations, 5_000_000)
    
    logger.debug(f"Running {iterations:,} hash iterations for complexity {complexity}")
    
    # CPU-bound work: iterative hashing
    data = seed.encode()
    for i in range(iterations):
        data = hashlib.sha256(data).digest()
        
        # Periodically do some extra work to prevent optimization
        if i % 10000 == 0:
            _ = hashlib.sha512(data).hexdigest()


def verify_qr_hash(qr_hash: str, expected_data: str) -> bool:
    """
    Verify a QR code hash matches expected ticket data.
    
    Args:
        qr_hash: The hash stored in database
        expected_data: The expected ticket data string
        
    Returns:
        True if hash matches, False otherwise
    """
    expected_hash = hashlib.sha256(expected_data.encode()).hexdigest()[:32]
    return qr_hash == expected_hash
