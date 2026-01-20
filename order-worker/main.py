from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uvicorn
import os

app = FastAPI(
    title="Order Worker Service",
    description="Heavy order processing service",
    version="1.0.0"
)

# Models
class Order(BaseModel):
    event_id: int
    user_id: int
    seat_ids: list[int]
    quantity: int

class OrderResponse(BaseModel):
    order_id: str
    status: str
    message: str
    timestamp: str

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "order-worker",
        "timestamp": datetime.now().isoformat()
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Order Worker Service - Heavy Processing",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "process_order": "/orders/process (POST)",
            "order_status": "/orders/{order_id} (GET)"
        }
    }

# Process order endpoint (placeholder)
@app.post("/orders/process", response_model=OrderResponse)
async def process_order(order: Order):
    """
    Process a new order - Heavy computational work happens here
    """
    # Simulate order processing
    order_id = f"ORD-{order.event_id}-{order.user_id}-{datetime.now().timestamp()}"
    
    return OrderResponse(
        order_id=order_id,
        status="processing",
        message="Order received and being processed",
        timestamp=datetime.now().isoformat()
    )

# Get order status endpoint (placeholder)
@app.get("/orders/{order_id}")
async def get_order_status(order_id: str):
    """
    Get the status of an order
    """
    return {
        "order_id": order_id,
        "status": "completed",
        "message": "Order status endpoint - to be implemented",
        "timestamp": datetime.now().isoformat()
    }

# Run server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
