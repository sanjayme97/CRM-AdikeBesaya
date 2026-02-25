# Entities

## Lead
Core entity — a prospective farmer customer.
Key fields: farmerName, phone, village, taluk, district, cropType, farmSizeAcres, numPlants, cropAge,
            leadSource, leadStatus, leadOwner, irrigationType, notes, assignedTo

## FieldVisit
A farm visit linked to a Lead.
Key fields: leadId, scheduledDate, visitedDate, status, visitOutcome, cropCondition, notes,
            identifiedProblems (string[] — Supabase only), addedBy
Relationship: belongsTo Lead

## Quotation
A price quote linked to a Lead (and optionally a FieldVisit).
Key fields: leadId, visitId (nullable), displayId, quoteDate, quoteAmount, validUntil,
            status, deliveryStatus, deliveryDate, notes, usageInstructions, preparedBy, attachmentFileId
Relationships: belongsTo Lead, optionally belongsTo FieldVisit, hasMany LineItem, hasMany Payment

## Payment
A payment received against a Quotation.
Key fields: quoteId, leadId, paymentDate, amount, paymentMode, referenceNumber, notes, receivedBy
Relationship: belongsTo Quotation

## Product (Supabase only)
A product/chemical available for sale.
Key fields: name, category (e.g. "Drenching", "Spraying"), unit, unitPrice, dosage, description, isActive

## LineItem (Supabase only)
A product line in a Quotation.
Key fields: quotationId, productId, productName, unitPrice, quantity, notes, displayOrder
Relationship: belongsTo Quotation, belongsTo Product

## Lookup Values by Category
- District — Karnataka districts
- Taluk — taluks per district (TalukWithDistrict type)
- CropType — Arecanut, Coconut, etc.
- LeadSource — how lead was acquired
- LeadStatus — pipeline stage
- IrrigationType — drip, flood, etc.
- VisitStatus — Scheduled, Completed, Cancelled
- VisitOutcome — result of visit
- CropCondition — condition observed
- QuotationStatus — Draft, Sent, Accepted, Rejected, Expired
- DeliveryStatus — Pending, Scheduled, Delivered, Partial

## CROP_PROBLEMS (src/types/index.ts)
Array of 20 crop disease/problem objects: { en: string, kn: string }
Used in FieldVisit identifiedProblems and rendered in QuotationPDF with Kannada script.
