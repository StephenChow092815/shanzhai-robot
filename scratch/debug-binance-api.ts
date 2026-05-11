import axios from 'axios';
import * as dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

async function testBinanceAnnouncements() {
  const proxyUrl = process.env.HTTPS_PROXY;
  let proxyConfig = undefined;
  
  if (proxyUrl) {
    const url = new URL(proxyUrl);
    proxyConfig = {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname === 'host.docker.internal' ? '127.0.0.1' : url.hostname,
      port: parseInt(url.port, 10)
    };
    console.log(`[Test] Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
  }

  const endpoint = 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query';
  console.log(`[Test] Fetching from: ${endpoint}`);

  try {
    const start = Date.now();
    const response = await axios.get(endpoint, {
      params: { 
        catalogId: "48", 
        pageNo: 1, 
        pageSize: 20,
        lang: "zh-CN"
      },
      proxy: proxyConfig,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Clienttype': 'web'
      }
    });
    const duration = Date.now() - start;
    console.log(`[Test] Response Status: ${response.status} (Took ${duration}ms)`);
    console.log(`[Test] Response Code: ${response.data.code}`);
    
    if (response.data.data?.articles) {
      console.log(`[Test] Success! Found ${response.data.data.articles.length} articles.`);
      response.data.data.articles.slice(0, 3).forEach((a: any) => {
        console.log(` - ${a.title}`);
      });
    } else {
      console.log('[Test] No articles found in data.');
    }
  } catch (error: any) {
    console.error(`[Test] Failed: ${error.message}`);
    if (error.response) {
      console.error(`[Test] Response Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

testBinanceAnnouncements();
