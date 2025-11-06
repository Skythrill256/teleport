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

package servicecfg

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDatabase_CheckAndSetDefaults_AuthValidation(t *testing.T) {
	tests := []struct {
		name    string
		db      Database
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid aws_sm auth with all required fields",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "aws_sm",
					AWS: DatabaseAuthAWS{
						Region:   "us-east-1",
						SecretID: "prod/db/app-postgres",
						Mode:     "string",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid aws_sm auth with json mode",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "aws_sm",
					AWS: DatabaseAuthAWS{
						Region:   "us-east-1",
						SecretID: "prod/db/app-postgres",
						Mode:     "json",
						Fields: map[string]string{
							"password": "password",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "aws_sm auth missing secret_id",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "aws_sm",
					AWS: DatabaseAuthAWS{
						Region: "us-east-1",
						Mode:   "string",
					},
				},
			},
			wantErr: true,
			errMsg:  "secret_id",
		},
		{
			name: "aws_sm auth missing region",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "aws_sm",
					AWS: DatabaseAuthAWS{
						SecretID: "prod/db/app-postgres",
						Mode:     "string",
					},
				},
			},
			wantErr: true,
			errMsg:  "region",
		},
		{
			name: "aws_sm auth invalid mode",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "aws_sm",
					AWS: DatabaseAuthAWS{
						Region:   "us-east-1",
						SecretID: "prod/db/app-postgres",
						Mode:     "invalid",
					},
				},
			},
			wantErr: true,
			errMsg:  "mode",
		},
		{
			name: "non-aws_sm auth type (no validation)",
			db: Database{
				Name:     "test-db",
				Protocol: "postgres",
				URI:      "localhost:5432",
				Auth: DatabaseAuth{
					Type: "other",
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.db.CheckAndSetDefaults()
			if tt.wantErr {
				require.Error(t, err)
				require.Contains(t, err.Error(), tt.errMsg)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestDatabase_ToDatabase_StoresAuthInLabels(t *testing.T) {
	db := Database{
		Name:     "test-db",
		Protocol: "postgres",
		URI:      "localhost:5432",
		Auth: DatabaseAuth{
			Type: "aws_sm",
			AWS: DatabaseAuthAWS{
				Region:   "us-east-1",
				SecretID: "prod/db/app-postgres",
				Mode:     "string",
			},
		},
		DBName: "mydb",
		DBUser: "admin",
	}

	database, err := db.ToDatabase()
	require.NoError(t, err)

	labels := database.GetStaticLabels()
	require.Equal(t, "aws_sm", labels["teleport.dev/auth_type"])
	require.Equal(t, "prod/db/app-postgres", labels["teleport.dev/auth_aws_secret_id"])
	require.Equal(t, "us-east-1", labels["teleport.dev/auth_aws_region"])
	require.Equal(t, "string", labels["teleport.dev/auth_aws_mode"])
	require.Equal(t, "mydb", labels["teleport.dev/db_name"])
	require.Equal(t, "admin", labels["teleport.dev/db_user"])
}

func TestDatabase_ToDatabase_StoresJSONFields(t *testing.T) {
	db := Database{
		Name:     "test-db",
		Protocol: "postgres",
		URI:      "localhost:5432",
		Auth: DatabaseAuth{
			Type: "aws_sm",
			AWS: DatabaseAuthAWS{
				Region:   "us-east-1",
				SecretID: "prod/db/app-postgres",
				Mode:     "json",
				Fields: map[string]string{
					"password": "password",
					"username": "user",
				},
			},
		},
	}

	database, err := db.ToDatabase()
	require.NoError(t, err)

	labels := database.GetStaticLabels()
	require.Contains(t, labels, "teleport.dev/auth_aws_fields")
	// Verify JSON is valid
	var fields map[string]string
	err = json.Unmarshal([]byte(labels["teleport.dev/auth_aws_fields"]), &fields)
	require.NoError(t, err)
	require.Equal(t, "password", fields["password"])
	require.Equal(t, "user", fields["username"])
}

