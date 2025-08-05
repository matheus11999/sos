const fs = require('fs-extra');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        this.logFile = path.join(this.logDir, 'app.log');
        this.errorFile = path.join(this.logDir, 'error.log');
        this.debugTerminal = process.env.DEBUG_TERMINAL === 'true';
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.ensureDir(this.logDir);
        } catch (error) {
            console.error('Error creating log directory:', error);
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${logData}\n`;
    }

    async writeToFile(filename, message) {
        try {
            await fs.appendFile(filename, message);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    log(message, data = null) {
        const formattedMessage = this.formatMessage('info', message, data);
        console.log(formattedMessage.trim());
        this.writeToFile(this.logFile, formattedMessage);
    }

    error(message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : null;
        
        const formattedMessage = this.formatMessage('error', message, errorData);
        console.error(formattedMessage.trim());
        this.writeToFile(this.errorFile, formattedMessage);
        this.writeToFile(this.logFile, formattedMessage);
    }

    warn(message, data = null) {
        const formattedMessage = this.formatMessage('warn', message, data);
        console.warn(formattedMessage.trim());
        this.writeToFile(this.logFile, formattedMessage);
    }

    debug(message, data = null) {
        if (process.env.LOG_LEVEL === 'debug') {
            const formattedMessage = this.formatMessage('debug', message, data);
            console.log(formattedMessage.trim());
            this.writeToFile(this.logFile, formattedMessage);
        }
    }

    logRequest(req) {
        const requestData = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };
        
        if (this.debugTerminal) {
            console.log('\n🔵 === INCOMING REQUEST ===');
            console.log(`📥 ${req.method} ${req.url}`);
            console.log(`🕐 ${new Date().toISOString()}`);
            if (req.body && Object.keys(req.body).length > 0) {
                console.log('📄 Body:', JSON.stringify(req.body, null, 2));
            }
            console.log('========================\n');
        }
        
        this.log(`HTTP Request: ${req.method} ${req.url}`, requestData);
    }

    logResponse(res, responseTime) {
        const responseData = {
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`
        };
        
        if (this.debugTerminal) {
            console.log(`📤 Response: ${res.statusCode} (${responseTime}ms)\n`);
        }
        
        this.log(`HTTP Response: ${res.statusCode}`, responseData);
    }

    logWebhook(webhookData) {
        if (this.debugTerminal) {
            console.log('\n🔔 === WEBHOOK RECEIVED ===');
            console.log(`📨 Event: ${webhookData.event || 'unknown'}`);
            console.log(`🕐 ${new Date().toISOString()}`);
            console.log('📄 Data:', JSON.stringify(webhookData, null, 2));
            console.log('=========================\n');
        }
        
        this.log('Webhook received', {
            event: webhookData.event,
            timestamp: new Date().toISOString(),
            dataKeys: Object.keys(webhookData.data || {})
        });
    }

    logMessageProcessing(senderNumber, messageText, isAdmin, processingResult) {
        if (this.debugTerminal) {
            console.log('\n💬 === MESSAGE PROCESSING ===');
            console.log(`📱 From: ${senderNumber} ${isAdmin ? '(ADMIN)' : '(CLIENT)'}`);
            console.log(`📝 Message: ${messageText}`);
            console.log(`✅ Success: ${processingResult.success}`);
            console.log(`🎯 Action: ${processingResult.action}`);
            console.log('============================\n');
        }
        
        this.log('Message processed', {
            senderNumber,
            messageText: messageText.substring(0, 100),
            isAdmin,
            success: processingResult.success,
            action: processingResult.action
        });
    }

    logDatabaseOperation(operation, params, result) {
        this.log(`Database ${operation}`, {
            params,
            success: result.success,
            message: result.message
        });
    }

    logAPICall(service, endpoint, success, responseTime) {
        if (this.debugTerminal) {
            console.log(`🌐 API Call: ${service} - ${success ? '✅' : '❌'} (${responseTime}ms)`);
        }
        
        this.log(`API Call: ${service}`, {
            endpoint,
            success,
            responseTime: `${responseTime}ms`
        });
    }

    logOutgoingMessage(phoneNumber, message, success) {
        if (this.debugTerminal) {
            console.log('\n📤 === OUTGOING MESSAGE ===');
            console.log(`📱 To: ${phoneNumber}`);
            console.log(`📝 Message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
            console.log(`✅ Sent: ${success ? 'YES' : 'NO'}`);
            console.log('==========================\n');
        }
        
        this.log(`Message sent to ${phoneNumber}`, {
            messagePreview: message.substring(0, 100),
            success: success
        });
    }

    async clearOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.readdir(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    this.log(`Deleted old log file: ${file}`);
                }
            }
        } catch (error) {
            this.error('Error clearing old logs:', error);
        }
    }
}

module.exports = Logger;