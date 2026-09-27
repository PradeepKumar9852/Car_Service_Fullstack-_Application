-- Schema Definition for Car Service Voice & Chat Agent
-- Creates tables for customer records and conversation history

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year VARCHAR(20),
    registration_vin VARCHAR(100),
    mileage VARCHAR(50),
    issue_start_time VARCHAR(100),
    complaint TEXT,
    drivable_status VARCHAR(50) DEFAULT 'Unknown',
    intake_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on phone & email for fast customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 2. Conversations Table (Chat history & assessment logs linked to customer)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    safety_alert JSONB,
    diagnostic_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on session_id and customer_id for query performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
