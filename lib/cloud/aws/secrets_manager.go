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

package aws

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/gravitational/trace"
)

// GetSecret retrieves a secret from AWS Secrets Manager.
// If LOCALSTACK environment variable is set to "true", it uses http://localhost:4566 as the endpoint.
// If mode is "string", it returns the SecretString directly.
// If mode is "json", it extracts the specified fields from the JSON structure.
func GetSecret(ctx context.Context, region, secretID, mode string, fields map[string]string) (string, error) {
	if region == "" {
		return "", trace.BadParameter("region is required")
	}
	if secretID == "" {
		return "", trace.BadParameter("secret_id is required")
	}

	// Load AWS config
	cfgOpts := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}

	// Support LocalStack for local testing
	if strings.ToLower(os.Getenv("LOCALSTACK")) == "true" {
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           "http://localhost:4566",
				SigningRegion: region,
			}, nil
		})
		cfgOpts = append(cfgOpts, config.WithEndpointResolverWithOptions(customResolver))
	}

	awsCfg, err := config.LoadDefaultConfig(ctx, cfgOpts...)
	if err != nil {
		return "", trace.Wrap(err, "failed to load AWS config")
	}

	client := secretsmanager.NewFromConfig(awsCfg)

	input := &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretID),
	}

	result, err := client.GetSecretValue(ctx, input)
	if err != nil {
		return "", trace.Wrap(err, "failed to get secret value from AWS Secrets Manager")
	}

	// Handle string mode
	if mode == "string" || mode == "" {
		if result.SecretString != nil {
			return *result.SecretString, nil
		}
		// Fallback to SecretBinary if SecretString is nil
		if result.SecretBinary != nil {
			return string(result.SecretBinary), nil
		}
		return "", trace.BadParameter("secret has no string or binary value")
	}

	// Handle JSON mode
	if mode == "json" {
		if result.SecretString == nil {
			return "", trace.BadParameter("secret value is not a string (required for JSON mode)")
		}

		var secretMap map[string]interface{}
		if err := json.Unmarshal([]byte(*result.SecretString), &secretMap); err != nil {
			return "", trace.Wrap(err, "failed to parse secret as JSON")
		}

		// If fields are specified, extract them
		if len(fields) > 0 {
			extracted := make(map[string]string)
			for key, alias := range fields {
				if val, ok := secretMap[key]; ok {
					// Convert value to string
					var strVal string
					switch v := val.(type) {
					case string:
						strVal = v
					case float64:
						strVal = strings.TrimSuffix(strings.TrimSuffix(fmt.Sprintf("%.0f", v), ".0"), ".0")
					default:
						strVal = fmt.Sprintf("%v", v)
					}
					if alias != "" {
						extracted[alias] = strVal
					} else {
						extracted[key] = strVal
					}
				} else {
					return "", trace.NotFound("key %q not found in secret JSON", key)
				}
			}
			// Return the password field if specified, otherwise return the first extracted value
			if password, ok := extracted["password"]; ok {
				return password, nil
			}
			// Return first value if no password field
			for _, val := range extracted {
				return val, nil
			}
		}

		// If no fields specified, try to find common password fields
		if password, ok := secretMap["password"]; ok {
			if str, ok := password.(string); ok {
				return str, nil
			}
		}
		if password, ok := secretMap["Password"]; ok {
			if str, ok := password.(string); ok {
				return str, nil
			}
		}

		return "", trace.BadParameter("no password field found in secret JSON and no fields specified")
	}

	return "", trace.BadParameter("invalid mode: %q (must be 'string' or 'json')", mode)
}

