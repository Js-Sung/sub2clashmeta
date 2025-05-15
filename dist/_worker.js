import yaml from 'js-yaml';
import { clash_config } from './config.js';

var key_default = "123456";
var udp_default = true;
var tfo_default = false;

export default {
  async fetch(request, env, ctx) {
    let key = (env.key || key_default).replace(/\W/g, '');
    let url = new URL(request.url);

    if (url.pathname.search(new RegExp('^(?:|\/*|(\/+index.html?)?)$')) != -1) {
      return nginx(200);
    }
    else if (url.pathname.search(new RegExp('^\/' + key + '($|\/)')) != -1) {
      const SUBINF = '/sub';   // 订阅转换接口
      let path = url.pathname.slice(key.length + 1);
      if (path.search(new RegExp('^(?:|\/(index.html?)?)$')) != -1) {
        return gen_html(url.origin + '/' + key + SUBINF + '?');
      }
      else if (path == SUBINF) {
        let headers = { 'Content-Type': 'text/plain; charset=utf-8' };
        let par = url.searchParams;
        let t = par.get('target');
        let u = par.get('url');
        if (url) {
          u = u.replaceAll('|', '\n');
        }
        let udp = par.get('udp') || undefined;
        let tfo = par.get('tfo') || undefined;
        let mp = par.get('mp') || undefined;
        let sp = par.get('sp') || undefined;
        let hp = par.get('hp') || undefined;
        let rp = par.get('rp') || undefined;
        let tp = par.get('tp') || undefined;
        let ui = par.get('ui') || undefined;
        let secret = par.get('secret') || undefined;

        if (t == 'clash') {
          let x = await gen_cfg(u, udp, tfo, mp, sp, rp, hp, tp, ui, secret);
          if (x != null) {
            let y = yaml.dump(x.data);
            let up = x.up;
            let dn = x.dn;
            let to = x.to;
            let ex = x.ex;
            if (!isNaN(up) && !isNaN(dn) && !isNaN(to) && !isNaN(ex)) {
              headers['Subscription-Userinfo'] = `upload=${up}; download=${dn}; total=${to}; expire=${ex}`;
            }
            return new Response(y, { status: 200, headers });
          } else {
            return new Response('no valid nodes.', { status: 404, headers });
          }
        } else {
          return new Response('unsupported target.', { status: 403, headers });
        }
      }
    }
    else if (url.pathname == '/favicon.ico') {
      return gen_icon();
    }
    return nginx(404);
  },

};


function nginx(code) {
  var t, text;
  if (code == 200) {
    text = `<!DOCTYPE html><html><head><title>Welcome to nginx!</title><style>body{width: 35em;margin: 0 auto;font-family: Tahoma, Verdana, Arial, sans-serif;}</style></head><body><h1>Welcome to nginx!</h1><p>If you see this page, the nginx web server is successfully installed and  working. Further configuration is required.</p><p>For online documentation and support please refer to  <a href="http://nginx.org/">nginx.org</a>.<br/>  Commercial support is available at <a href="http://nginx.com/">nginx.com</a>.</p><p><em>Thank you for using nginx.</em></p></body></html>`;
  } else {
    switch (code) {
      case 403: t = '403 Forbidden'; break;
      case 404: t = '404 Not Found'; break;
      default: code = 500; t = '500 Internal Server Error'; break;
    }
    text = `<html><head><title>${t}</title></head><body><center><h1>${t}</h1></center><hr><center>nginx/1.18.0</center></body></html>`;
  }
  return new Response(text, { status: code, headers: new Headers({ "Server": "nginx/1.18.0 (Ubuntu)", "Date": Date(), "Content-Type": "text/html" }) });
}


function gen_html(pre) {
  let t = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>sub2clashmeta</title><style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse}th,td{border:1px solid#dddddd;text-align:left;padding:8px;width:120px}textarea{width:1000px;height:75px}th{background-color:#f2f2f2}button{padding:8px 16px;background-color:#4CAF50;color:white;border:none;cursor:pointer}button:hover{background-color:#3c8a3f}tr:nth-child(even){background-color:#f9f9f9}</style><script>function processText(){let js={};var a,b;a=document.getElementById('inputText').value;a=a.trim();if(!a){return}js.url=a.split('\\n').join('|');a=document.getElementById('client');try{js.target=a.value}catch(e){}b=["udp","tfo"];for(let c in b){try{a=document.getElementsByName(b[c]);for(let i=1;i<a.length;i++){if(a[i].checked){js[b[c]]=a[i].value;break}}}catch(e){}}b=['mp','sp','hp','rp','tp'];for(let c in b){a=document.getElementById(b[c]);try{let i=parseInt(a.value,10);if(i>0&&i<65536){js[b[c]]=i}}catch(e){}}a=document.getElementById('ui');try{if(a.value&&!/[\s\\:\?\*\|\"\'\<\>\$\!\@\&]/.test(a.value)){js.ui=a.value}}catch(e){}a=document.getElementById('secret');try{a=a.value.trim();if(/^[0-9a-zA-Z]+$/.test(a)){js.secret=a}}catch(e){}a=new URLSearchParams(js).toString();document.getElementById('outputText').value='${pre}'+a}</script></head><body><h3>订阅转换</h3><table><tr><td>订阅链接：</td><td><textarea id="inputText"placeholder="支持订阅链接/base64订阅内容/ss/ssr/vmess/trojan/hysteria/hysteria2/vless节点，多个链接每行一个或用|分隔"></textarea><br></td></tr><tr><td>客户端：</td><td><select id="client"><option value="clash">mihomo/clash</option></select></td></tr><tr><td>UDP代理：</td><td><label><input type="radio"name="udp"value="2"checked/>默认</label><label><input type="radio"name="udp"value="1"/>使能</label><label><input type="radio"name="udp"value="0"/>禁用</label></td></tr><tr><td>tcp fast open：</td><td><label><input type="radio"name="tfo"value="2"checked/>默认</label><label><input type="radio"name="tfo"value="1"/>使能</label><label><input type="radio"name="tfo"value="0"/>禁用</label></td></tr><tr><td>mix-port：</td><td><input type="text"id="mp"placeholder="1-65535(留空为默认值)"></td></tr><tr><td>socks-port：</td><td><input type="text"id="sp"placeholder="1-65535(留空为默认值)"></td></tr><tr><td>port：</td><td><input type="text"id="hp"placeholder="1-65535(留空为默认值)"></td></tr><tr><td>redir-port：</td><td><input type="text"id="rp"placeholder="1-65535(留空为默认值)"></td></tr><tr><td>tproxy-port：</td><td><input type="text"id="tp"placeholder="1-65535(留空为默认值)"></td></tr><tr><td>UI目录：</td><td><input type="text"id="ui"placeholder="目录名(留空为默认值)"></td></tr><tr><td>UI访问密钥：</td><td><input type="text"id="secret"placeholder="字母数字组合(留空为默认值)"></td></tr><tr><td>定制订阅：</td><td><textarea id="outputText"readonly></textarea></td></tr></table><br><button onclick="processText()">生成订阅链接</button><br></body></html>`;
  return new Response(t, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}


function gen_icon() {
  const b64data = "AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAgBAAAMMOAADDDg" + 'A'.repeat(60) + "Dg4dY7y8zK/8zLzv/MzM3/0M/Q/9DRyP+prLr/v8DH/9jY1//09PUE" + 'A'.repeat(112) + "293hMGVnvf+kpsD/2trJ/8rLxv/KzMH/dnjB/1BN2f+Vmbj/0dDI/97e4Cs" + 'A'.repeat(106) + "PP08wR8fNThW1fl/2Rotf94ecb/b2/M/2hqxP9nYuz/c2v8/2dnyv/f4Nf/6eruFra34HOXl92pi4rfwoyK4MKgoOKaztDmS" + 'A'.repeat(75) + "sbLafp+b8v+Pjej/hH/v/4qE+P+Aefj/gXr4/3t28P9wau//a2Xw/4eKzv9vbd//Ylzq/3Js8f9zbfP/bmj0/2hi8f9uZe3/kqDbtOvw8BI" + 'A'.repeat(63) + "Cjo92YqqX4/8fE+f/r6vv/7+75/8nI9P9/ee//eXTw/3Br7v9ya/P/XFvT/3Bq7v+opPv/nZnz/5CM8v+FgfD/enbw/21k7P9HmuH/c7Xc6ern7Rk" + 'A'.repeat(53) + "6OrvGqGf45/Oyvv/9PX8/7O1/P+rqvn/7u74/7e28v9xa/D/dG7v/29o9P9qaNr/qazU/6yq6v+emvX/mZX0/46J8v+FgfP/fWzx/1yM3f9FtOj/ibbbwgAAAAAAAAAAAAAAALW1/3M" + 'A'.repeat(31) + "Dn6e4ap6Xo/+Lf/f+1t/v/m539/4+O+v+YlPP/0dXz/3Zw8P90b+//bWby/3Bt4f/y9PT/7/Dy/66u3/+emvX/mZX0/4uJ7v97heb/YqTj/1Ky5v9SruX/wdDjXQAAAAAAAAAAmJj/qQ" + 'A'.repeat(31) + "PDx8wupqOeQ0s/7/7Gz+/+kpvv/mZn5/5yY9P/MzvP/d3Lw/3Vw7v9xafb/Y2LU/9nc5P8AAAAA9PXzBK2s4padnvH/gb7k/3bE6f9rvun/YLPm/0uv6P+Ju+DCAAAAAAAAAADGxv9W" + 'A'.repeat(37) + "K6u3YW8uPn/7e37//X0/v/s7Pv/9vj4/6+u8f92cO//eXPu/3Jr8P9VVc7/cnHS/+7w8RAAAAAA2dnoOaGi56qQy+7/hMbu/3i/6v9uu+j/V7Po/2iw4Pvt6/ES" + 'A'.repeat(48) + "wMTXZIyL4P/Szvv//f38///////U1Pr/iIL3/395+P9wavf/amTy/2xo4/9jXPD/lpfWwgAAAAAAAAAAqMHfnpvV8/+Qyu3/g8Xs/3rA6v9nuur/Xa3f/97h6ys" + 'A'.repeat(47) + "B/f9LaVlbO/4eC9/+Sjvn/hoTl/21p4/9oZtj/ZWTL/25uwP9oabr/a2bt/4iB+/9tad7/0tXjSQAAAADd5Owxocvm/5rU8/+PzvL/h8ju/3XA7P9crN//4eTsJ" + 'A'.repeat(43) + "u73ea2Jc5/95cfz/VlXW/1latv96eqn/iIiv/5uYsP+kn6//p6Gw/6ehrf9qaqz/enfp/5eS/P9xc7D/o6K2qq+vx47U2eT/tMzid53G456Lxem+fMnz/2Gp2//y7/ML" + 'A'.repeat(42) + "CXl9qugnv5/2Nh4v94eaf/ysbI/+Pg4v/p5uf/4d/k/9zZ4v/W097/09Dd/9zZ2/+MjLP/bW3H/3l5sf+8tcP/oJu3/5GRsf/KydhPAAAAANbZ5Dljp9j/ea3W3w" + 'A'.repeat(47) + "JWT4LWAfer/e3yn/9/b3f/w7vX/3d3q/9fW4v/q6Oz/5+Xq/+rp7f/r6u7/8O/z/9/c4P+9vMj/3dzk/+Tj5v+vp7f/jY2u/+jq8BkAAAAAAAAAAMjQ4FPI0OFT" + 'A'.repeat(48) + "qqzbjHZ2qf/Z1df/+Pb6/5mZqf9IRH//cG+s/9rb4f/t7O//6unt/+rp7//q6e7/7u7z//39+v/7+/j/qqXK/358sv+mqcOQ8vP3Bw" + 'A'.repeat(68) + "DAwtBktrLD//Hw8v/h4ev/oqOr/7Kysv/q6e3/1tbi/+no7v/x8PL/+fjz//v69P/5+PT/5OPz/5OR5v9UUeH/TEvX/9fZ6DY" + 'A'.repeat(74) + "J6duaO+uMn/4+Ho/+np7f+rrNn/kJDR/97d5P/+/fj/+fj0//b19//S0fH/w8L1/7e29v93deX/YF3g/2Ng4P9RTd3/k5bPsPX39AQ" + 'A'.repeat(63) + "Dj5e0hko+svLeyxP/6+fj/ycre/yoroP8AAJ3/bW60/+rq+P/T0vb/urnu/7+/8f+Ghsz/IiGf/1hesP9xcOH/ZGHg/1tY4v9ERMj/amzI+Onr7hY" + 'A'.repeat(58) + "Ly+0mufnLb/9PP2/////v/ExOT/hITR/6mo6v+vruz/trTz/5CUx/+XmMb/9ff2/21uWf8qKnH/LDCb/3Z14v9mY+H/Wlff/1ZU2v9JRt3/hIXTzQ" + 'A'.repeat(58) + "1tjkO56euf/z8/T/1NPx/6ak8/+sqPb/j5LT/7698//Pzfr/pqjS/2Vppf8ZF4z/CglS/62tyf9ZWqv/dnPo/2dl4P9bWN//VFLa/3Jx3v9RT9v/xcfgVg" + 'A'.repeat(52) + "DMzd1Ora/Ehba513ZVWb3/i4vi/36ByP96f8D/w8H4/8TD8v/Fw/f/io/B/0JImf8LDpP/GyCI/3d32f93dej/ZmTf/1tY4v9OTsr/Y2PN/2Ng3v99fdfX" + 'A'.repeat(53) + "OXn7h7k5u8hAAAAAJWZybFiZ8H/foHN/6+t8f+0svD/uLjx/7e28f+ysPP/lpjb/4WI0P+Pjun/hIHr/3Bv4f9oZOb/V1bT/1RT0f9STt//cHDV/1pZ1P/Z2+Yy" + 'A'.repeat(64) + "6uzxFo6N4sCin/f/o6Hr/6qo7v+urO//rKru/6ak7P+hnvD/l5Xw/4eF6P97eeP/dHHp/15e0v9QUMr/WFXj/1NQ3/9jYdf/WFfS/6iszIw" + 'A'.repeat(69) + "vsDeZ4B/4NqcmfD/n53s/6Gf6/+gnuv/m5nq/5KR6P+JiOb/goDn/3Jv6P9aWdP/TU/D/1JR0v9WVNr/VFHh/2FizP9UVsH/m57Hog" + 'A'.repeat(74) + "wMPgZIaH28+Xlur/m5nv/5mX7v+Vk+3/j43t/4iG6f9zceDth4jXxqGlz5dvbtvxWFfV/1BQzP9KSNb/ZWfE/7y8y/+qq8qI" + 'A'.repeat(80) + "oqbSm09SwP9wc8z/dHbR/3N00v9vcMz/VljH/4mNyMIAAAAAAAAAAO7w8Q7CxOVdnZ3hnoCB09TDxtha5uXsHbe4zm/z9PgE" + 'A'.repeat(74) + "Df4PApUFDN/0tLz/9VUt3/TEvW/19gzf9QTdv/srTfeg" + 'A'.repeat(36) + "Dy8vQH8PDzCw" + 'A'.repeat(84) + "CLjdbEQUHM/05N2f9WU97/Z2bb/1xa2v/g4uoo" + 'A'.repeat(133) + "NbY6Tt0eMXtiYu+/1layf9XVs//iIzBxg" + 'A'.repeat(143) + "Ofp6Rrb2eA0tLPR/5mbvqXi5Ock" + 'A'.repeat(149) + "NbY5DvGxtdW3N7nLw" + 'A'.repeat(154) + "8vP2B+Xn7h0" + 'A'.repeat(256) + "=";
  let faviconData = new Uint8Array(Buffer.from(b64data, 'base64'));
  return new Response(faviconData, { headers: { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=31536000' } });
}


function isValidUrl(urlString) {
  var urlPattern = new RegExp('(?:https?):\/\/(\\w+:?\\w*)?(\\S+)(:\\d+)?(\/|\/([\\w#!:.?+=&%!-\/]))?', 'i');
  return !!urlPattern.test(urlString);
}


function contentTypeIsText(headers) {
  if (!headers.get("content-type") ||
    headers.get("content-type").indexOf('text/') !== -1 ||
    headers.get("content-type").indexOf('javascript') !== -1 ||
    headers.get("content-type").indexOf('urlencoded') !== -1 ||
    headers.get("content-type").indexOf('json') !== -1 ||
    headers.get("content-type").indexOf('application/') !== -1) {
    return true;
  } else {
    return false;
  }
}


async function gen_cfg(data, udp_en, tfo_en, mp, sp, rp, hp, tp, ui, secret) {
  let proxy = {}, nodes_name;
  let cfg = structuredClone(clash_config);

  if (typeof (data) != 'string' || data.length < 1) {
    return null;
  }

  await gen_nodes(data, proxy);
  if (proxy.nodes.length < 1) {
    return null;
  }

  // 处理节点数据：去重和name重命名
  try {
    let s = new Set();
    let i = proxy.nodes.filter(obj => {
      if (!obj.name) return false;
      let key = `${obj.server}-${obj.port}`;
      if (s.has(key)) return false;
      s.add(key);
      return true;
    });
    let m = new Map();
    proxy.nodes = i.map(obj => {
      let o = obj.name;
      if (m.has(o)) {
        let r = Math.random().toString(36).substring(2, 12);
        let n = `${o}-${r}`;
        return { ...obj, name: n };
      } else {
        m.set(o, true);
        return obj;
      }
    });
    nodes_name = proxy.nodes.map(item => item.name);
    console.log('---' + proxy.nodes.length + 'nodes---' + `\nupload=${proxy.up}; download=${proxy.dn}; total=${proxy.to}; expire=${proxy.ex}`); // 调试输出
  } catch (e) {
    console.error("Error processing nodes: %o", e);
    return null;
  }

  // 修改端口、UI、密码等配置
  if (udp_en !== undefined) {
    let en = /^(t|1|y|enable|on)$/i.test(udp_en) ? true : false;
    proxy.nodes.forEach(item => {
      if (item.udp !== undefined) {
        item.udp = en;
      }
    });
  }
  if (tfo_en !== undefined) {
    let en = /^(t|1|y|enable|on)$/i.test(tfo_en) ? true : false;
    proxy.nodes.forEach(item => {
      if (item.tfo !== undefined) {
        item.tfo = en;
      }
    });
  }
  let v = { "mixed-port": mp, "socks-port": sp, "redir-port": rp, "port": hp, "tproxy-port": tp };
  for (let j in v) {
    try {
      if (/^\d+$/.test(v[j])) {
        let i = parseInt(v[j], 10);
        if (i > 0 && i < 65536) cfg[j] = i;
      }
    } catch (e) { }
  }
  v = { "external-ui": ui, "secret": secret };
  for (let j in v) {
    try {
      if (v[j]) cfg[j] = v[j];
    } catch (e) { }
  }

  // 生成配置 
  try {
    cfg['proxies'] = proxy.nodes;
    cfg['proxy-groups'].forEach(obj => {
      if (obj.name && !/广告|拦截|直连|净化/.test(obj.name)) {
        if (obj.proxies && Array.isArray(obj.proxies)) {
          obj.proxies.push(...nodes_name);
        } else {
          obj.proxies = nodes_name.slice();
        }
      }
    });
  } catch (e) {
    console.error("Error processing proxy groups: %o", e);
    return null;
  }

  return { 'data': cfg, 'up': proxy.up, 'dn': proxy.dn, 'to': proxy.to, 'ex': proxy.ex };
}


async function gen_nodes(data, proxy) {
  if (!data || !proxy) {
    return null;
  }
  if (!Array.isArray(proxy.nodes)) {
    proxy.nodes = [];
  }
  if (typeof (data) == 'object') {
    let up, dn, to, ex;
    up = data.up; // upload
    dn = data.dn; // download
    to = data.to; // total
    ex = data.ex; // expire

    if (!isNaN(up) && !isNaN(dn) && !isNaN(to) && !isNaN(ex)) {
      if (!isNaN(proxy.up) && !isNaN(proxy.dn) && !isNaN(proxy.to) && !isNaN(proxy.ex)) {
        proxy.up += up; // 累计上传流量
        proxy.dn += dn; // 累计下载流量
        proxy.to += to; // 累计总流量
        proxy.ex = Math.max(proxy.ex, ex);  // 取最晚过期的
      } else {
        proxy.up = up;
        proxy.dn = dn;
        proxy.to = to;
        proxy.ex = ex;
      }
    }

    data = data.data;
  }
  if (typeof (data) != 'string' || data.length < 1) {
    return null;
  }
  if (!/[^-_a-zA-Z0-9+/=\r\n ]/.test(data)) {
    let d0 = decodeBase64(data);
    if (d0 != null) {
      await gen_nodes(d0, proxy);
      return null;
    }
  } else {
    try {
      let d1 = yaml.load(data);
      let nodes = d1['proxies'];
      if (nodes && nodes.length > 0) {
        proxy.nodes.push(...nodes);
        return null;
      }
    } catch (e) {
      console.error("yaml error: %o", e);
    }
    data = data.trim();
    var lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let n = lines[i].trim();
      if (!/[^-_a-zA-Z0-9+/=\r\n ]/.test(n)) {
        await gen_nodes(n, proxy);
        continue;
      } else {
        var pre = n.split('://')[0];
        var node = null;
        switch (pre) {
          case 'ss':
            node = decode_ss(n);
            break;
          case 'ssr':
            node = decode_ssr(n);
            break;
          case 'vmess':
            node = decode_vmess(n);
            break;
          case 'trojan':
            node = decode_trojan(n);
            break;
          case 'http':
          case 'https':
            await gen_nodes(await decode_link(n), proxy);
            break;
          case 'hysteria':
            node = decode_hysteria(n);
            break;
          case 'hysteria2':
          case 'hy2':
            node = decode_hysteria2(n);
            break;
          case 'vless':
            node = decode_vless(n);
            break;
        }
        if (node != null) {
          proxy.nodes.push(node);
        }
      }
    }
  }
  return null;
}


async function decode_link(url) {
  var t, r, req, z, up, dn, to, ex;
  if (!isValidUrl(url)) return null;
  try {
    req = new Request(url, { 'method': 'GET', 'headers': { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' } });
    r = await fetch(req);
    if (!contentTypeIsText(r.headers) || r.status != 200) {
      return null;
    }
    t = await r.text();
  } catch (e) {
    console.error("fetch error: " + url + '\n', e);
    return null;
  }

  try {
    z = r.headers.get('subscription-userinfo');
    if (z) {
      up = parseInt(z.match(/upload=(\d+)/i)[1], 10);;
      dn = parseInt(z.match(/download=(\d+)/i)[1], 10);
      to = parseInt(z.match(/total=(\d+)/i)[1], 10);
      ex = parseInt(z.match(/expire=(\d+)/i)[1], 10);
    }
  } catch (e) { }

  if (!isNaN(up) && !isNaN(dn) && !isNaN(to) && !isNaN(ex)) {
    return { 'data': t, 'up': up, 'dn': dn, 'to': to, 'ex': ex };
  }
  return t;
}


function decodeBase64(str) {
  if (!str || str.length == 0) return null;
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  str = Buffer.from(str, 'base64').toString('utf-8');
  if (str.includes('\ufffd')) {
    return null;
  }
  return str;
}


function decodeURIComponentSafe(str) {
  try {
    return decodeURIComponent(str.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
  } catch (e) {
    return str;
  }
}


function decode_ss(ssLink) {
  const pre = 'ss://';
  const ssCiphers = new Set([
    "rc4-md5", "aes-128-gcm", "aes-192-gcm", "aes-256-gcm", "aes-128-cfb",
    "aes-192-cfb", "aes-256-cfb", "aes-128-ctr", "aes-192-ctr", "aes-256-ctr",
    "camellia-128-cfb", "camellia-192-cfb", "camellia-256-cfb", "bf-cfb",
    "chacha20-ietf-poly1305", "xchacha20-ietf-poly1305", "salsa20", "chacha20",
    "chacha20-ietf", "2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305", "2022-blake3-chacha12-poly1305",
    "2022-blake3-chacha8-poly1305"
  ]);

  var datapart, password, cipher, server, port, name, decoded, parts, decodedPassword, randomName;

  if (!ssLink.startsWith(pre)) {
    return null;
  }
  try {
    datapart = ssLink.slice(pre.length);

    if (/^[-_a-zA-Z0-9+\/=]+$/.test(datapart)) {
      decoded = decodeBase64(datapart);
      parts = decoded.split(/[@:]/);
      cipher = parts[0];
      password = parts[1];
      server = parts[2];
      port = parseInt(parts[3], 10);
    } else if (/@\S+:\d+/.test(datapart)) {
      parts = datapart.split(/[@:]/);
      decodedPassword = decodeBase64(parts[0]);
      cipher = decodedPassword.split(':')[0];
      password = decodedPassword.split(':')[1];
      server = parts[1];
      port = parseInt(parts[2], 10);
      name = decodeURIComponentSafe(datapart.match(/#(\S+)/)[1]);
    } else {
      name = decodeURIComponentSafe(datapart.match(/#(\S+)/)[1]);
      decoded = decodeBase64(datapart.replace(/#.*/, ''));
      parts = decoded.split(/[@:]/);
      cipher = parts[0];
      password = parts[1];
      server = parts[2];
      port = parseInt(parts[3], 10);
    }
  } catch (e) {
    console.error("SS decode error: " + ssLink + '\n', e);
    return null;
  }

  if (!port || !cipher || !ssCiphers.has(cipher.toLowerCase())) return null;
  randomName = `ss-${Math.random().toString(36).substring(2, 12)}`;

  return {
    name: name || randomName,
    type: "ss",
    server: server,
    port: port,
    password: password,
    cipher: cipher,
    udp: udp_default,
    tfo: tfo_default
  };
}


function decode_ssr(ssrLink) {
  const ssrCiphers = new Set([
    "none", "table", "rc4", "rc4-md5", "aes-128-cfb", "aes-192-cfb", "aes-256-cfb",
    "aes-128-ctr", "aes-192-ctr", "aes-256-ctr", "bf-cfb", "camellia-128-cfb",
    "camellia-192-cfb", "camellia-256-cfb", "cast5-cfb", "des-cfb", "idea-cfb",
    "rc2-cfb", "seed-cfb", "salsa20", "chacha20", "chacha20-ietf"
  ]);
  var base64Part, decoded, serverInfo, queryString, server, port, protocol, cipher, obfs, passwordBase64, params, protocol_param, obfs_param, remarks, password, randomName;
  const pre = 'ssr://';

  if (!ssrLink.startsWith(pre)) {
    return null;
  }

  try {
    base64Part = ssrLink.slice(pre.length);
    decoded = decodeBase64(base64Part);

    // 分割服务器信息和查询参数
    [serverInfo, queryString] = decoded.split('/?');
    [server, port, protocol, cipher, obfs, passwordBase64] = serverInfo.split(':');

    // 解析查询参数
    params = new URLSearchParams(queryString);
    protocol_param = decodeBase64(params.get('protoparam'));
    obfs_param = decodeBase64(params.get('obfsparam'));
    remarks = decodeBase64(params.get('remarks'));
    password = decodeBase64(passwordBase64);
  } catch (e) {
    console.error("SSR decode error: " + ssrLink + '\n', e);
    return null;
  }

  if (!port || !password || !cipher || !ssrCiphers.has(cipher.toLowerCase())) return null;
  randomName = `ssr-${Math.random().toString(36).substring(2, 12)}`;

  return {
    name: remarks || randomName,
    type: "ssr",
    server: server,
    port: parseInt(port, 10),
    password: password,
    cipher: cipher,
    protocol: protocol,
    protocol_param: protocol_param || '',
    obfs: obfs,
    obfs_param: obfs_param || '',
    udp: udp_default
  };
}


function decode_vmess(vmessLink) {
  const pre = 'vmess://';
  var base64Part, values, vmess, network, tls, alpn, sni, headers, httpOpts, h2Opts, wsOpts, grpcOpts, cipher, host, path;
  if (!vmessLink.startsWith(pre)) {
    return null;
  }
  try {
    base64Part = vmessLink.slice(pre.length);
    values = JSON.parse(decodeBase64(base64Part));
  } catch (e) {
    console.error("vmess decode error: " + vmessLink + '\n', e);
    return null;
  }

  vmess = {};
  vmess["name"] = values["ps"];
  vmess["type"] = 'vmess';
  vmess["server"] = values["add"];
  vmess["port"] = values["port"];
  vmess["uuid"] = values["id"];
  vmess["alterId"] = values["aid"] || 0;
  vmess["udp"] = udp_default;
  vmess["tfo"] = tfo_default;
  //vmess["xudp"] = true;
  vmess["tls"] = false;
  vmess["skip-cert-verify"] = false;

  vmess["cipher"] = "auto";
  cipher = values["scy"];
  if (cipher) {
    vmess["cipher"] = cipher;
  }

  sni = values["sni"];
  if (sni) {
    vmess["servername"] = sni;
  }

  network = values["net"] || "";
  network = network.toLowerCase();
  if (values["type"] === "http") {
    network = "http";
  } else if (network === "http") {
    network = "h2";
  }
  vmess["network"] = network;

  tls = values["tls"];
  if (tls !== undefined) {
    tls = tls.toString().toLowerCase();
    if (tls.endsWith("tls")) {
      vmess["tls"] = true;
    }
    alpn = values["alpn"];
    if (alpn) {
      vmess["alpn"] = alpn.split(",");
    }
  }

  path = values["path"];
  host = values["host"];
  if (network === "http") {
    headers = {};
    httpOpts = {};
    if (host) {
      headers["Host"] = host.split(',');
    }
    httpOpts["path"] = ["/"];
    if (path) {
      httpOpts["path"] = path.split(',');
    }
    httpOpts["headers"] = headers;

    vmess["http-opts"] = httpOpts;

  } else if (network === "h2") {
    headers = {};
    h2Opts = {};
    if (host) {
      headers["Host"] = host.split(',');
    }
    if (path) {
      h2Opts["path"] = path;
    }
    h2Opts["headers"] = headers;
    vmess["h2-opts"] = h2Opts;

  } else if (network === "ws") {
    headers = {};
    wsOpts = {};
    wsOpts["path"] = "/";
    if (host) {
      headers["Host"] = host.split(',')[0];
    }
    if (path) {
      wsOpts["path"] = path;
    }
    wsOpts["headers"] = headers;
    vmess["ws-opts"] = wsOpts;

  } else if (network === "grpc") {
    grpcOpts = {};
    if (path) {
      grpcOpts["grpc-service-name"] = path;
    }
    vmess["grpc-opts"] = grpcOpts;
  }
  return vmess;
}


function decode_hysteria(hysteriaLink) {
  const pre = 'hysteria://';
  var dataPart, parts, server, port, params, name, alpn, up, down, randomName, hysteria;
  if (!hysteriaLink.startsWith(pre)) {
    return null;
  }
  try {
    dataPart = hysteriaLink.slice(pre.length);
    parts = new URL('http://' + dataPart);
    server = parts["hostname"];
    port = parseInt(parts["port"] || '80', 10);
    name = parts["hash"];
    if (name) {
      name = decodeURIComponentSafe(name.slice(1));
    }
    params = parts.searchParams;
  } catch (e) {
    console.error("Hysteria decode error: " + hysteriaLink + '\n', e);
    return null;
  }

  if (!port || !server) return null;
  randomName = `hy-${Math.random().toString(36).substring(2, 12)}`;

  hysteria = {};
  hysteria["name"] = name || randomName;
  hysteria["type"] = 'hysteria';
  hysteria["server"] = server;
  hysteria["port"] = port;
  hysteria["sni"] = params.get("peer") || "";
  hysteria["obfs"] = params.get("obfs") || "";
  alpn = params.get("alpn") || "";
  if (alpn) {
    hysteria["alpn"] = alpn.split(",");
  }
  hysteria["auth_str"] = params.get("auth");
  hysteria["protocol"] = params.get("protocol");
  up = params.get("up") || params.get("upmbps");
  down = params.get("down") || params.get("downmbps");

  if (!up) {
    hysteria["up"] = up;
  }
  if (!down) {
    hysteria["down"] = down;
  }
  hysteria["skip-cert-verify"] = /y|t|1|on/i.test(params.get("insecure"));

  return hysteria;
}


function decode_vless(vlessLink) {
  const pre = 'vless://';
  var dataPart, parts, server, port, uuid, params, name, vless, randomName;
  if (!vlessLink.startsWith(pre)) {
    return null;
  }
  try {
    dataPart = vlessLink.slice(pre.length);
    parts = new URL('http://' + dataPart);
    uuid = parts["username"];
    server = parts["hostname"];
    port = parseInt(parts["port"] || '80', 10);
    name = parts["hash"];
    if (name) {
      name = decodeURIComponentSafe(name.slice(1));
    }
    params = parts.searchParams;
  } catch (e) {
    console.error("vless decode error: " + vlessLink + '\n', e);
    return null;
  }

  if (!port || !server || !uuid) return null;
  randomName = `vless-${Math.random().toString(36).substring(2, 12)}`;

  vless = {};
  vless["name"] = name || randomName;
  vless["type"] = 'vless';
  vless["server"] = server;
  vless["port"] = port;
  vless["uuid"] = uuid;
  vless["udp"] = udp_default;
  vless["tfo"] = tfo_default;

  let tls = (params.get("security") || '').toLowerCase();
  if (tls.endsWith("tls") || tls == "reality") {
    vless["tls"] = true;
    let fingerprint = params.get("fp");
    if (!fingerprint) {
      vless["client-fingerprint"] = "chrome";
    } else {
      vless["client-fingerprint"] = fingerprint;
    }
    let alpn = params.get("alpn");
    if (alpn) {
      vless["alpn"] = alpn.split(",");
    }
  }
  let host = params.get("host");
  let sni = params.get("sni") || host;
  if (sni) {
    vless["servername"] = sni;
  }
  let realityPublicKey = params.get("pbk");
  if (realityPublicKey) {
    vless["reality-opts"] = {
      "public-key": realityPublicKey,
      "short-id": params.get("sid") || ""
    };
  }

  let switchEncoding = params.get("packetEncoding");
  if (!switchEncoding || switchEncoding == "none") {
    // Do nothing
  } else if (switchEncoding == "packet") {
    vless["packet-encoding"] = "packet-addr";
  } else {
    vless["packet-encoding"] = "xudp";
  }

  let network = params.get("type") || "";
  network = network.toLowerCase();
  if (!network) {
    network = "tcp";
  }
  let fakeType = params.get("headerType") || "";
  fakeType = fakeType.toLowerCase();
  if (network == "tcp" && fakeType == "http") {
    network = "http";
  } else if (network == "http") {
    network = "h2";
  }
  vless["network"] = network;
  
  if (network == "http") {
      let headers = {};
      let httpOpts = {};
      httpOpts["path"] = ["/"];
      if (host) {
        headers["Host"] = host.split(",");
      }
      let method = params.get("method");
      if (method) {
        httpOpts["method"] = method;
      }
      let path = params.get("path");
      if (path) {
        httpOpts["path"] = path.split(",");;
      }
      httpOpts["headers"] = headers;
      vless["http-opts"] = httpOpts;
  } else if (network == "h2") {
    let headers = {};
    let h2Opts = {};
    h2Opts["path"] = "/";
    let path = params.get("path");
    if (path) {
      h2Opts["path"] = String(path);
    }
    let host = params.get("host");
    if (host) {
      h2Opts["host"] = host.split(",");
    }
    h2Opts["headers"] = headers;
    vless["h2-opts"] = h2Opts;
  } else if (network == "ws") {
    let headers = {};
    let wsOpts = {};
    headers["User-Agent"] = "Mozilla/5.0"; // Replace with a random user agent if needed
    let host = params.get("host");
    if (host) {
      headers["host"] = String(host);
    }
    let path = params.get("path");
    if (path) {
      wsOpts["path"] = String(path);
    }
    wsOpts["headers"] = headers;

    let earlyData = params.get("ed");
    if (earlyData) {
      try {
        let med = parseInt(earlyData);
        wsOpts["max-early-data"] = med;
      } catch (e) { }
    }
    let earlyDataHeader = params.get("edh");
    if (earlyDataHeader) {
      wsOpts["early-data-header-name"] = earlyDataHeader;
    }

    vless["ws-opts"] = wsOpts;
  } else if (network == "grpc") {
    let grpcOpts = {};
    grpcOpts["grpc-service-name"] = params.get("serviceName") || '';
    vless["grpc-opts"] = grpcOpts;
  }
  let flow = params.get("flow");
  if (flow) {
    flow = String(flow).toLowerCase();
    let s = new Set(['xtls-rprx-vision-udp443', 'udp443']);
    if (s.has(flow)) {
      vless["flow"] = flow;
    } else {
      try {
        s.forEach((v) => {
          if (RegExp(v, 'i').test(flow)) {
            vless["flow"] = v;
            throw new Error();
          }
        });
      } catch (e) { }
    }
  }

  return vless;
}


function decode_trojan(trojanLink) {
  const pre = 'trojan://';
  var dataPart, parts, server, port, password, params, name, trojan, randomName;
  if (!trojanLink.startsWith(pre)) {
    return null;
  }
  try {
    dataPart = trojanLink.slice(pre.length);
    parts = new URL('https://' + dataPart);
    server = parts["hostname"];
    port = parseInt(parts["port"] || '443', 10);
    name = parts["hash"];
    if (name) {
      name = decodeURIComponentSafe(name.slice(1));
    }
    params = parts.searchParams;
    password = parts["username"];
  } catch (e) {
    console.error("Trojan decode error: " + trojanLink + '\n', e);
    return null;
  }

  if (!port || !server || !password) return null;
  randomName = `trojan-${Math.random().toString(36).substring(2, 12)}`;

  trojan = {};
  trojan["name"] = name || randomName;
  trojan["type"] = 'trojan';
  trojan["server"] = server;
  trojan["port"] = port;
  trojan["password"] = password;
  trojan["udp"] = udp_default;
  trojan["tfo"] = tfo_default;

  //let tls = params.get("security");
  //if (tls && (tls.endsWith("tls"))) {
  //  trojan["tls"] = true;
  //}
  let skip_cert_verify = params.get("allowInsecure");
  if (skip_cert_verify) {
    trojan["skip-cert-verify"] = /y|t|1|on/i.test(skip_cert_verify);
  }
  let sni = params.get("sni");
  if (sni) {
    trojan["sni"] = sni;
  }
  let alpn = params.get("alpn");
  if (alpn) {
    trojan["alpn"] = alpn.split(",");
  }
  let network = params.get("type") || "";
  network = network.toLowerCase();
  if (network) {
    trojan["network"] = network;
  }

  if (network === "ws") {
    let headers = {};
    let wsOpts = {};
    let path = params.get("path");
    if (path) {
      wsOpts["path"] = path;
    }
    headers["User-Agent"] = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36";
    wsOpts["headers"] = headers;
    trojan["ws-opts"] = wsOpts;
  }
  else if (network === "grpc") {
    let grpcOpts = {};
    grpcOpts["grpc-service-name"] = params.get("serviceName") || '';
    trojan["grpc-opts"] = grpcOpts;
  }

  let fingerprint = params.get("fp");
  if (!fingerprint) {
    trojan["client-fingerprint"] = "chrome";
  } else {
    trojan["client-fingerprint"] = fingerprint;
  }

  return trojan;
}


function decode_hysteria2(hysteria2Link) {
  const pre1 = 'hysteria2://';
  const pre2 = 'hy2://';
  var dataPart, u, server, port, params, name, alpn, obfs, sni, auth, randomName, hysteria2, fp, up, down;
  if (hysteria2Link.startsWith(pre1)) {
    dataPart = hysteria2Link.slice(pre1.length);
  } else if (hysteria2Link.startsWith(pre2)) {
    dataPart = hysteria2Link.slice(pre2.length);
  } else {
    return null;
  }

  try {
    u = new URL('https://' + dataPart);
    server = u.hostname;
    port = parseInt(u.port || "443", 10);
    name = u.hash;
    if (name) {
      name = decodeURIComponentSafe(name.slice(1));
    }
    params = u.searchParams;
  } catch (e) {
    console.error("Hysteria2 decode error: " + hysteria2Link + '\n', e);
    return null;
  }

  if (!server) return null;
  randomName = `hy2-${Math.random().toString(36).substring(2, 12)}`;

  hysteria2 = {};
  hysteria2["name"] = name || randomName;
  hysteria2["type"] = 'hysteria2';
  hysteria2["server"] = server;
  hysteria2["port"] = port;

  obfs = params.get("obfs");
  if (obfs && obfs.toLowerCase() !== "none") {
    hysteria2["obfs"] = obfs;
    hysteria2["obfs-password"] = params.get("obfs-password");
  }
  sni = params.get("sni") || params.get("peer");
  if (sni) {
    hysteria2["sni"] = sni;
  }
  alpn = params.get("alpn") || "";
  if (alpn) {
    hysteria2["alpn"] = alpn.split(",");
  }
  hysteria2["skip-cert-verify"] = /y|t|1|on/i.test(params.get("insecure"));
  auth = u.username;
  if (auth) {
    hysteria2["password"] = auth;
  }
  fp = params.get("pinSHA256");
  if (fp) {
    hysteria2["fingerprint"] = fp;
  }
  up = params.get("up");
  if (up) {
    hysteria2["up"] = up;
  }
  down = params.get("down");
  if (down) {
    hysteria2["down"] = down;
  }

  return hysteria2;
}
