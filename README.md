This plugin will seed your AWS SSM Paramter Store with the environment you have defined in your serverless config. By default your .env will be used to populate the values;

More information about SSM environment variables: [Server Variables from AWS SSM Parameter Store](https://serverless.com/framework/docs/providers/aws/guide/variables/#reference-variables-using-the-ssm-parameter-store)

# Installation
```bash
npm i serverless-ssm-init
```

# Configuration
In your `serverless.yml`:

## Define the plugin

```yaml
plugins:
    - serverless-ssm-init
```
## Define the configuration
```yaml
custom:
  ssm: 
    secure: ['SECURE_VAR']
    ignore: ['SOME_VAR']
    stages: ['dev', 'staging', 'production']
```

## Define the ssm environment variables
```yaml
  environment:
    SECURE_VAR: ${ssm:/${self:custom.stage}/SECURE_VAR~true}
    SOME_VAR: ${ssm:/${self:custom.stage}/SOME_VAR}
```

# Usage
Seed using your .env values for the defaults:
```
sls ssm-init
```

Use a string instead of .env values for the defaults:
```
sls ssm-init --ssm-default='default'
```

# Verify
* Login to your AWS Console 
* Services -> Systems Manager 
* Parameter Store

You should now see your environment parameters.