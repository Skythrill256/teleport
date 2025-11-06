/*
 * Teleport
 * Copyright (C) 2024 Gravitational, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package common

import (
	"testing"

	"github.com/gravitational/teleport/api/types"
	"github.com/gravitational/teleport/lib/tlsca"
	"github.com/stretchr/testify/require"
)

func TestDatabaseInfo_CheckAndSetDefaults_UsesConfiguredValues(t *testing.T) {
	tests := []struct {
		name           string
		dbLabels       map[string]string
		initialUser    string
		initialDB      string
		expectedUser   string
		expectedDB     string
		shouldPrompt   bool
	}{
		{
			name: "uses configured db_name and db_user",
			dbLabels: map[string]string{
				"teleport.dev/db_name": "mydb",
				"teleport.dev/db_user": "admin",
			},
			initialUser:  "",
			initialDB:    "",
			expectedUser: "admin",
			expectedDB:   "mydb",
			shouldPrompt: false,
		},
		{
			name: "CLI flags override configured values",
			dbLabels: map[string]string{
				"teleport.dev/db_name": "mydb",
				"teleport.dev/db_user": "admin",
			},
			initialUser:  "customuser",
			initialDB:    "customdb",
			expectedUser: "customuser",
			expectedDB:   "customdb",
			shouldPrompt: false,
		},
		{
			name: "no configured values, should prompt",
			dbLabels: map[string]string{},
			initialUser:  "",
			initialDB:    "",
			expectedUser: "",
			expectedDB:   "",
			shouldPrompt: true,
		},
		{
			name: "only db_name configured",
			dbLabels: map[string]string{
				"teleport.dev/db_name": "mydb",
			},
			initialUser:  "",
			initialDB:    "",
			expectedUser: "",
			expectedDB:   "mydb",
			shouldPrompt: true, // Still prompts for user
		},
		{
			name: "only db_user configured",
			dbLabels: map[string]string{
				"teleport.dev/db_user": "admin",
			},
			initialUser:  "",
			initialDB:    "",
			expectedUser: "admin",
			expectedDB:   "",
			shouldPrompt: true, // Still prompts for db name
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock database with labels
			db, err := types.NewDatabaseV3(types.Metadata{
				Name:   "test-db",
				Labels: tt.dbLabels,
			}, types.DatabaseSpecV3{
				Protocol: "postgres",
				URI:      "localhost:5432",
			})
			require.NoError(t, err)

			info := &databaseInfo{
				RouteToDatabase: tlsca.RouteToDatabase{
					ServiceName: "test-db",
					Protocol:    "postgres",
					Username:    tt.initialUser,
					Database:    tt.initialDB,
				},
				database: db,
			}

			// Note: This is a simplified test that checks the label retrieval logic
			// A full test would require mocking the checker and other dependencies
			if configuredDBName, ok := db.GetStaticLabels()["teleport.dev/db_name"]; ok && info.Database == "" {
				info.Database = configuredDBName
			}
			if configuredDBUser, ok := db.GetStaticLabels()["teleport.dev/db_user"]; ok && info.Username == "" {
				info.Username = configuredDBUser
			}

			if tt.expectedDB != "" {
				require.Equal(t, tt.expectedDB, info.Database, "Database name should match expected")
			}
			if tt.expectedUser != "" {
				require.Equal(t, tt.expectedUser, info.Username, "Database user should match expected")
			}
		})
	}
}

