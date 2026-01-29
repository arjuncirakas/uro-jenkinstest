pipeline {
    agent { label 'linux-build-node' }

    environment {
        // Node.js environment
        NODE_ENV = 'test'
        CI = 'true'
        
        // SonarQube configuration
        SONAR_SCANNER_HOME = tool 'SonarQubeScanner'
        
        // Node.js memory settings for large builds
        NODE_OPTIONS = '--max-old-space-size=4096'
    }

    options {
        // Build configuration
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    tools {
        nodejs 'NodeJS-20' // Ensure NodeJS 20.x is configured in Jenkins
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout scm
                
                script {
                    // Get commit info for notifications
                    env.GIT_COMMIT_MSG = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    env.GIT_AUTHOR = sh(script: 'git log -1 --pretty=%an', returnStdout: true).trim()
                }
            }
        }

        stage('Environment Setup') {
            steps {
                echo '🔧 Setting up environment...'
                sh 'node --version'
                sh 'npm --version'
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        echo '📦 Installing backend dependencies...'
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        echo '📦 Installing frontend dependencies...'
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Code Quality - Lint') {
            parallel {
                stage('Frontend Lint') {
                    steps {
                        echo '🔍 Linting frontend code...'
                        dir('frontend') {
                            sh 'npm run lint || true' // Continue even if lint has warnings
                        }
                    }
                }
            }
        }

        stage('Run Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        echo '🧪 Running backend tests with coverage...'
                        dir('backend') {
                            sh 'npm run test:coverage || true'
                        }
                    }
                    post {
                        always {
                            // Archive test results if available
                            junit allowEmptyResults: true, testResults: 'backend/coverage/junit.xml'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        echo '🧪 Running frontend tests with coverage...'
                        dir('frontend') {
                            sh 'npm run test:coverage || true'
                        }
                    }
                    post {
                        always {
                            // Archive test results if available
                            junit allowEmptyResults: true, testResults: 'frontend/coverage/junit.xml'
                        }
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '📊 Running SonarQube analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                            -Dsonar.projectKey=uroprep-test \
                            -Dsonar.projectName="UroPrep (Test)" \
                            -Dsonar.projectVersion=${BUILD_NUMBER} \
                            -Dsonar.sources=frontend/src,backend \
                            -Dsonar.tests=frontend/src,backend \
                            -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.spec.js,**/*.spec.jsx \
                            -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.min.js,**/coverage/**
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo '🚦 Waiting for SonarQube Quality Gate...'
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false // Set to true to fail build on quality gate failure
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '🏗️ Building frontend for production...'
                dir('frontend') {
                    sh 'npm run build'
                }
            }
            post {
                success {
                    // Archive the build artifacts
                    archiveArtifacts artifacts: 'frontend/dist/**/*', fingerprint: true
                }
            }
        }

        stage('Deploy to Test Environment') {
            when {
                branch 'master'
            }
            steps {
                echo '🚀 Deploying to test environment...'
                sh 'chmod +x deploy.sh'
                sh './deploy.sh'
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up workspace...'
            cleanWs(cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true,
                    patterns: [[pattern: 'node_modules/**', type: 'INCLUDE'],
                               [pattern: 'frontend/node_modules/**', type: 'INCLUDE'],
                               [pattern: 'backend/node_modules/**', type: 'INCLUDE']])
        }
        success {
            echo '''
╔════════════════════════════════════════════════════════╗
║   ✅ BUILD SUCCESSFUL!                                ║
║   UroPrep Test Environment is ready.                  ║
╚════════════════════════════════════════════════════════╝
            '''
        }
        failure {
            echo '''
╔════════════════════════════════════════════════════════╗
║   ❌ BUILD FAILED!                                    ║
║   Check Jenkins Console Output for details.           ║
╚════════════════════════════════════════════════════════╝
            '''
        }
        unstable {
            echo '''
╔════════════════════════════════════════════════════════╗
║   ⚠️ BUILD UNSTABLE!                                  ║
║   Some tests may have failed. Review test results.    ║
╚════════════════════════════════════════════════════════╝
            '''
        }
    }
}