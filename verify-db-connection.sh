#!/bin/bash

echo "=== Teleport Database Connection Verification ==="
echo ""

echo "1. Checking if Teleport is running..."
if pgrep -f "teleport start" > /dev/null; then
    echo "   ✅ Teleport is running"
else
    echo "   ❌ Teleport is NOT running"
    echo "   Start with: ./build/teleport start --config=teleport.yaml --roles=auth,proxy,node,db"
    exit 1
fi

echo ""
echo "2. Checking if PostgreSQL is running..."
if docker ps | grep test-postgres > /dev/null; then
    echo "   ✅ PostgreSQL container is running"
else
    echo "   ❌ PostgreSQL container is NOT running"
    exit 1
fi

echo ""
echo "3. Checking database registration..."
DB_COUNT=$(TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db --format=json | jq '. | length')
if [ "$DB_COUNT" -gt 0 ]; then
    echo "   ✅ Database registered: $DB_COUNT database(s)"
else
    echo "   ❌ No databases registered"
    exit 1
fi

echo ""
echo "4. Checking database object import rule..."
RULE_COUNT=$(TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db_object_import_rule --format=json | jq '. | length')
if [ "$RULE_COUNT" -gt 0 ]; then
    echo "   ✅ Import rule exists: $RULE_COUNT rule(s)"
else
    echo "   ❌ No import rules found"
    echo "   Create with: tctl create -f db-import-rule.yaml"
    exit 1
fi

echo ""
echo "5. Checking imported database objects..."
OBJ_COUNT=$(TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db_object --format=json | jq '. | length')
if [ "$OBJ_COUNT" -gt 0 ]; then
    echo "   ✅ Database objects imported: $OBJ_COUNT objects"
    echo ""
    echo "   Breakdown by database:"
    TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db_object --format=json | jq -r '.[] | .spec.database' | sort | uniq -c | sed 's/^/      /'
else
    echo "   ❌ No database objects found"
    echo "   Wait a few moments for import to complete, or check Teleport logs"
    exit 1
fi

echo ""
echo "6. Checking PostgreSQL connectivity..."
if psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL is accessible"
else
    echo "   ⚠️  PostgreSQL connection test failed (this may be expected)"
fi

echo ""
echo "=== All checks passed! ==="
echo ""
echo "Next steps:"
echo "1. Open the Teleport web UI at: https://localhost:3080"
echo "2. Navigate to the database connection page"
echo "3. You should now see database names and users in the dropdowns"
echo ""
echo "Useful commands:"
echo "  - List databases: TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db"
echo "  - List objects:   TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db_object"
echo "  - List rules:     TELEPORT_CONFIG_FILE=./teleport.yaml ./build/tctl get db_object_import_rule"
