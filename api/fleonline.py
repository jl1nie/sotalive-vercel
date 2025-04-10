#!/home/ubuntu/sotaapp/backend/sotaapp/bin/python3
# coding: utf-8
import cgi
import csv
import datetime
import io
import json
import logging
import re
import sys
from api.convutil import (
    get_ref,
    writeZIP,
    freq_to_band,
    band_to_freq,
    splitCallsign,
    mode_to_airhammode,
    mode_to_SOTAmode,
    mode_to_ADIFmode,
    adif
)


debug = False

keyword_table = {
    'mycall': 1,
    'operator': 1,
    'qslmsg': -1,
    'qslmsg2': -1,
    'mywwff': 1,
    'mysota': 1,
    'mypota': 1,
    'nickname': 1,
    'date': 1,
    'day': 1,
    'rigset': 1,
    'timezone': 1,
    'number': 1,
    'consecutive': 0,
}


def keyword(key):
    try:
        arg = keyword_table[key.lower()]
    except Exception as e:
        return None
    return ((key.lower(), arg))


mode_table = {
    'cw': 'rst',
    'ssb': 'rs',
    'fm': 'rs',
    'am': 'rs',
    'rtty': 'rst',
    'rtty': 'rst',
    'rty': 'rst',
    'psk': 'rst',
    'psk31': 'rst',
    'jt9': 'snr',
    'jt65': 'snr',
    'ft8': 'snr',
    'ft4': 'snr',
    'js8': 'snr',
    'dv': 'rs',
    'fusion': 'rs',
    'dstar': 'rs',
    'd-star': 'rs',
    'dmr': 'rs',
    'c4fm': 'rs',
    'freedv': 'rs',
}


def modes(key):
    try:
        arg = mode_table[key.lower()]
    except Exception as e:
        return None
    return (key.upper())


def modes_sig(key):
    try:
        arg = mode_table[key.lower()]
    except Exception as e:
        return None
    return (arg)


def parseCallsign(c):
    pat_call = re.compile(r'\w{1,3}[0-9]\w{0,5}[A-Z]$', re.I)
    pat_prefix = re.compile(r'\w{1,3}[0-9]$', re.I)
    pat_num = re.compile(r'[0-9]')
    pat_p1 = re.compile(r'(\w+)/(\d)$', re.I)
    pat_p2 = re.compile(r'(\w+)/(\w+)$', re.I)
    pat_p3 = re.compile(r'(\w+)/(\w+)/P$', re.I)
    pat_p4 = re.compile(r'(\w+)/(\w+)/QRP$', re.I)

    c = c.upper()

    if pat_call.match(c):
        return (c, c, '', '')
    else:
        p = pat_p1.match(c)
        if p:
            if pat_call.match(p.group(1)):
                return (c, p.group(1), p.group(2), '')
        else:
            p = pat_p2.match(c)
            if p:
                if pat_call.match(p.group(1)):
                    if pat_prefix.match(p.group(2)):
                        return (c, p.group(1), p.group(2), '')
                    if p.group(2) == 'QRP':
                        return (c, p.group(1), '', 'QRP')
                    if p.group(2) == 'P':
                        return (c, p.group(1), 'P', '')
                    else:
                        return None
                elif pat_call.match(p.group(2)):
                    if pat_prefix.match(p.group(1)):
                        return (c, p.group(2), p.group(1), '')
                    elif p.group(1) == 'QRP':
                        return (c, p.group(2), '', 'QRP')
                    else:
                        return None
            else:
                p = pat_p3.match(c)
                if p:
                    if pat_prefix.match(p.group(1)) and pat_call.match(p.group(2)):
                        return (c, p.group(2), p.group(1), '')
                    else:
                        return None
                else:
                    p = pat_p4.match(c)
                    if p:
                        if pat_call.match(p.group(1)):
                            if pat_prefix.match(p.group(2)):
                                return (c, p.group(1), p.group(2), 'QRP')
                            elif pat_num.match(p.group(2)):
                                return (c, p.group(1), p.group(2), 'QRP')
                        elif pat_prefix.match(p.group(1)) and pat_call.match(p.group(2)):
                            return (c, p.group(2), p.group(1), 'QRP')
                        else:
                            return None
                    else:
                        return None


def get_token(pos, line):
    res = ''
    while pos < len(line):
        c = line[pos]
        if c == ' ' or c == '　':
            if res != '':
                return (pos+1, res)
            else:
                pos += 1
        elif c in '#<[{':
            return (pos+1, c)
        else:
            res = res + c
            pos += 1
    return (pos, res)


def get_comment(pos, line):
    res = ""
    while pos < len(line):
        c = line[pos]
        if c in '>]}':
            return (pos+1, res)
        else:
            res = res + c
            pos += 1
    return (pos, res)


def tokenizer(line):
    res = []
    pos = 0

    while pos < len(line):
        pos, word = get_token(pos, line)
        w = word.upper()
        if w == '#':
            break
        if w == '':
            continue
        if w in '<[{':
            pos, comment = get_comment(pos, line)
            res.append(('comment', w, comment))
            continue
        m = re.match(r'(\d+)-(\d+)-(\d+)$', w)
        if m:
            res.append(('date', (m.group(1), m.group(2), m.group(3)), w))
            continue
        m = re.match(r'(\d+)-(\d+)$', w)
        if m:
            res.append(('date2', (m.group(1), m.group(2)), w))
            continue
        m = re.match(r'(\d+)/(\d+)/(\d+)$', w)
        if m:
            res.append(('date', (m.group(1), m.group(2), m.group(3)), w))
            continue
        m = re.match(r'(\d+)/(\d+)$', w)
        if m:
            res.append(('date2', (m.group(1), m.group(2)), w))
            continue
        m = re.match(r'\d+\.\d+$', w)
        if m:
            res.append(('freq', freq_to_band(w), w))
            continue
        m = re.match(r'[-\+]\d+$', w)
        if m:
            res.append(('snr', w, w))
            continue
        bd = band_to_freq(w, is_sota=True)
        if bd:
            res.append(('band', bd, word))
            continue
        m = re.match(r'\w+FF-\d+$', w)
        if m:
            res.append(('wwffref', w, word))
            continue
        m = re.match(r'\w+/\w+-\d+$', w)
        if m:
            res.append(('sotaref', w, word))
            continue
        m = re.match(r'\w+-\d+$', w)
        if m:
            res.append(('potaref', w, word))
            continue
        kw = keyword(w)
        if kw:
            if w == 'QSLMSG':
                w2 = re.sub(r'qslmsg\s+', '', line)
                res.append(('kw', kw, w2))
                break
            elif w == 'QSLMSG2':
                w2 = re.sub(r'qslmsg2\s+', '', line)
                res.append(('kw', kw, w2))
                break
            else:
                res.append(('kw', kw, word))
                continue
        md = modes(w)
        if md:
            res.append(('md', md, word))
            continue
        m = re.match(r'\d+$', w)
        if m:
            res.append(('dec', len(w), w))
            continue
        m = parseCallsign(w)
        if m:
            res.append(('call', w.upper(), word))
            continue
        m = re.match(r'\.\w+', w)
        if m:
            res.append(('ctstsent', w.upper(), word))
            continue
        m = re.match(r',\w+', w)
        if m:
            res.append(('ctstrcvd', w.upper(), word))
            continue
        m = re.match(r'.*[/\-]+.*', w)
        if m:
            res.append(('unknown', w, word))
            continue
        else:
            res.append(('literal', w.upper(), word))
            continue
    return (res)


def trans_tz(env):
    if env['timezone']:
        lotz = datetime.timedelta(hours=int(env['timezone']))
        dt_local = datetime.datetime(
            env['c_year'], env['c_month'], env['c_day'],
            env['c_hour'], env['c_min'], 0,
            tzinfo=datetime.timezone(lotz))
        utctz = datetime.timedelta(hours=0)
        dt_utc = dt_local.astimezone(datetime.timezone(utctz))

        env['utc_year'] = dt_utc.year
        env['utc_month'] = dt_utc.month
        env['utc_day'] = dt_utc.day
        env['utc_hour'] = dt_utc.hour
        env['utc_min'] = dt_utc.minute
    else:
        env['utc_year'] = env['c_year']
        env['utc_month'] = env['c_month']
        env['utc_day'] = env['c_day']
        env['utc_hour'] = env['c_hour']
        env['utc_min'] = env['c_min']

    return env


def compileFLE(input_text, conv_mode):
    res = []
    hamlogres = []
    (NORM, FREQ, RSTS, RSTR) = (1, 2, 3, 4)
    env = {
        'mycall': '',
        'operator': '',
        'qslmsg': '',
        'qslmsg2': '',
        'mywwff': '',
        'mysota': '',
        'mypota': [],
        'nickname': '',
        'rigset': 0,
        'timezone': '',
        'year': 2000,
        'month': 1,
        'day': 1,
        'c_year': 2000,
        'c_month': 1,
        'c_day': 1,
        'c_hour': 0,
        'c_min': 0,
        'utc_year': 2000,
        'utc_month': 1,
        'utc_day': 1,
        'utc_hour': 0,
        'utc_min': 0,
        'c_band': '',
        'c_freq': '',
        'c_mode': 'cw',
        'c_call': '',
        'c_rigset': 0,
        'c_his_wwff': '',
        'c_his_pota': [],
        'c_his_sota': '',
        'c_his_num': '',
        'c_my_num': '',
        'c_r_s': 5,
        'c_s_s': 9,
        'c_t_s': 9,
        'c_r_r': 5,
        'c_s_r': 9,
        'c_t_r': 9,
        'errno': [],
        'ctstnum': None,
        'ctstlit': None,
    }

    lines = input_text.splitlines()
    lc = 0
    qsoc = 0
    sotafl = False
    wwfffl = False
    potafl = False
    ctstfl = False

    for l in lines:
        env['c_r_s'] = 5
        env['c_s_s'] = 9
        env['c_t_s'] = 9
        env['c_r_r'] = 5
        env['c_s_r'] = 9
        env['c_t_r'] = 9
        env['c_call'] = ''
        env['c_snr_s'] = '-10'
        env['c_snr_r'] = '-10'
        env['c_his_wwff'] = ''
        env['c_his_sota'] = ''
        env['c_his_pota'] = []
        env['c_qso_msg'] = ''
        env['c_qso_rmks'] = ''
        env['c_his_num'] = ''
        env['c_my_num'] = ''

        tl = tokenizer(l)
        if not tl:
            lc += 1
            continue
        pos = 0
        ml = len(tl) - 1
        (t, p1, p2) = tl[pos]
        if t == 'kw':
            (key, l) = p1
            if key == 'day':
                if pos < ml:
                    (id, inc, w) = tl[pos+1]
                    try:
                        d = datetime.datetime(
                            env['c_year'], env['c_month'], env['c_day'])
                    except Exception as e:
                        env['errno'].append((lc, pos+1, 'Date out of range.'))
                        lc += 1
                        continue
                    delta = datetime.timedelta(days=0)
                    if w == '+':
                        delta = datetime.timedelta(days=1)
                    elif w == '++':
                        delta = datetime.timedelta(days=2)
                    else:
                        env['errno'].append((lc, pos+1, 'Unknown operand.'))
                        lc += 1
                        continue
                    d = d + delta
                    env['c_year'] = d.year
                    env['c_day'] = d.day
                    env['c_month'] = d.month
                    env['c_hour'] = 0
                    env['c_min'] = 0
                else:
                    env['errno'].append((lc, pos+1, 'Missing operand +/++.'))
                lc += 1
                continue
            if key == 'mycall':
                if pos < ml:
                    (id, p, w) = tl[pos+1]
                    if id == 'call':
                        (_, op, _, _) = parseCallsign(p)
                        env['mycall'] = p
                        env['operator'] = op
                    else:
                        env['errno'].append((lc, pos+1, 'Invalid callsign.'))
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))

                lc += 1
                continue
            if key == 'operator':
                if pos < ml:
                    (id, op, w) = tl[pos+1]
                    if id == 'call':
                        env['operator'] = op
                    else:
                        env['errno'].append((lc, pos+1, 'Invalid operator.'))
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))
                lc += 1
                continue
            if key == 'mywwff':
                if pos < ml:
                    (id, ref, w) = tl[pos+1]
                    if id == 'wwffref':
                        env['mywwff'] = ref
                        wwfffl = True
                    else:
                        env['errno'].append(
                            (lc, pos+1, f"{ref} is invalid WWFF ref#."))
                else:
                    env['errno'].append((lc, pos, 'Missing WWFF ref#.'))
                lc += 1
                continue
            if key == 'mysota':
                if pos < ml:
                    (id, ref, w) = tl[pos+1]
                    if id == 'sotaref':
                        env['mysota'] = ref
                        sotafl = True
                    else:
                        env['errno'].append(
                            (lc, pos+1, f"{ref} is invalid SOTA ref#."))
                else:
                    env['errno'].append((lc, pos, 'Missing SOTA ref#.'))
                lc += 1
                continue
            if key == 'mypota':
                if pos < ml:
                    while pos < ml:
                        pos += 1
                        (id, ref, w) = tl[pos]
                        if id == 'potaref':
                            env['mypota'] += [ref]
                            potafl = True
                        else:
                            env['errno'].append(
                                (lc, pos, f"{ref} is invalid POTA ref#."))
                            break
                else:
                    env['errno'].append((lc, pos, 'Missing POTA ref#.'))
                lc += 1
                continue
            if key == 'timezone':
                if pos < ml:
                    (id, tz, w) = tl[pos+1]
                    if id == 'snr':
                        env['timezone'] = tz
                    else:
                        env['errno'].append(
                            (lc, pos+1, f"{tz} is invalid timezone."))
                else:
                    env['errno'].append(
                        (lc, pos, 'Missing timezone. (eg. +9)'))
                lc += 1
                continue
            if key == 'number':
                if pos < ml:
                    (kw, _, w) = tl[pos+1]
                    if kw == 'kw' and w == 'consecutive':
                        env['ctstnum'] = 1
                    else:
                        env['ctstlit'] = w.upper()
                    ctstfl = True
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))
                lc += 1
                continue
            if key == 'nickname':
                if pos < ml:
                    (_, _, w) = tl[pos+1]
                    env['nickname'] = w
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))
                lc += 1
                continue
            if key == 'rigset':
                if pos < ml:
                    (id, _, w) = tl[pos+1]
                    if id == 'dec':
                        env['c_rigset'] = int(w)
                        env['rigset'] = int(w)
                    else:
                        env['errno'].append((lc, pos+1, 'Invalid Rig set#.'))
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))
                lc += 1
                continue
            if key == 'qslmsg':
                p2 = re.sub(r'\$mywwff', env['mywwff'], p2)
                p2 = re.sub(r'\$mypota', ' '.join(env['mypota']), p2)
                p2 = re.sub(r'\$mysota', env['mysota'], p2)
                env['qslmsg'] = p2
                lc += 1
                continue
            if key == 'date':
                if pos < ml:
                    (d, dp, w) = tl[pos+1]
                    if d == 'date':
                        (y, m, d) = dp
                        env['c_year'] = int(y)
                        env['year'] = int(y)
                        env['c_month'] = int(m)
                        env['month'] = int(m)
                        env['c_day'] = int(d)
                        env['day'] = int(d)
                    elif d == 'date2':
                        (m, d) = dp
                        env['c_month'] = int(m)
                        env['month'] = int(m)
                        env['c_day'] = int(d)
                        env['day'] = int(d)
                    else:
                        env['errno'].append((lc, pos+1, 'Wrong date format.'))
                        lc += 1
                        continue
                    if not ((int(y) > 1900) and (int(y) < 2100) and (int(m) > 0) and (int(m) < 13) and (int(d) > 0) and (int(d) < 32)):
                        env['errno'].append((lc, pos+1, 'Date out of range.'))
                        lc += 1
                        continue
                    env['c_hour'] = 0
                    env['c_min'] = 0
                else:
                    env['errno'].append((lc, pos, 'Missing operand.'))
                lc += 1
                continue
        else:
            length = len(tl)
            state = NORM
            while pos < length:
                (t, p1, p2) = tl[pos]
                if t == 'comment':
                    if p1 == '<':
                        env['c_qso_msg'] = p2
                    elif p1 == '{':
                        env['c_qso_rmks'] = p2
                    elif p1 == '[':
                        env['c_qsl_msg'] = p2
                    pos += 1
                    continue
                if state == NORM:
                    if t == 'md':
                        env['c_mode'] = p1
                        state = NORM
                        pos += 1
                        continue
                    if t == 'band':
                        env['c_band'] = p2
                        env['c_freq'] = band_to_freq(p2, True)
                        state = FREQ
                        pos += 1
                        continue
                    if t == 'dec':
                        if p1 == 1:
                            env['c_min'] = int(env['c_min']//10)*10 + int(p2)
                        elif p1 == 2:
                            env['c_min'] = int(p2) % 60
                        elif p1 == 3:
                            h = int(p2) // 100
                            m = int(p2) % 60
                            env['c_hour'] = int(env['c_hour']//10)*10 + h
                            env['c_min'] = m
                        elif p1 == 4:
                            h = int(p2) // 100
                            m = int(p2) % 100 % 60
                            env['c_hour'] = h
                            env['c_min'] = m
                        else:
                            env['errno'].append(
                                (lc, pos, 'Wrong time format.'))
                        pos += 1
                        state = NORM
                        continue
                    if t == 'freq':
                        env['c_freq'] = p2
                        (f, _, b) = freq_to_band(p2)
                        if f == 'Out of the band':
                            env['errno'].append((lc, pos, 'Unknown band.'))
                        env['c_band'] = b
                        pos += 1
                        state = NORM
                        continue
                    if t == 'wwffref':
                        env['c_his_wwff'] = p1
                        pos += 1
                        state = NORM
                        continue
                    if t == 'potaref':
                        env['c_his_pota'] += [p1]
                        pos += 1
                        state = NORM
                        continue
                    if t == 'sotaref':
                        env['c_his_sota'] = p1
                        pos += 1
                        state = NORM
                        continue
                    if t == 'call':
                        prev = env['c_call']
                        if prev != '':
                            env['errno'].append(
                                (lc, pos, 'Each line must contains only one callsign: '+p1))
                        if env['c_band'] == '' and env['c_freq'] == '':
                            env['errno'].append(
                                (lc, pos, 'Band or frequency must be specified before QSO.'))
                        env['c_call'] = p1
                        pos += 1
                        qsoc += 1
                        state = RSTS
                        continue
                    if t == 'ctstrcvd':
                        env['c_my_num'] = p1.replace(',', '')
                        if not env['c_his_num']:
                            if env['ctstnum']:
                                env['c_his_num'] = f"{env['ctstnum']:03}"
                                env['ctstnum'] += 1
                            elif env['ctstlit']:
                                env['c_his_num'] = env['ctstlit']
                        pos += 1
                        state = NORM
                        continue
                    if t == 'ctstsent':
                        s = p1.replace('.', '')
                        if env['ctstnum']:
                            try:
                                num = int(s)
                            except Exception as e:
                                num = 1
                            env['ctstnum'] = num + 1
                            env['c_his_num'] = f"{num:03}"
                        elif env['ctstlit']:
                            env['c_his_num'] = s.upper()
                        pos += 1
                        state = NORM
                        continue
                    if t == 'literal':
                        env['c_qso_msg'] = p2
                        pos += 1
                        if pos < length:
                            (t, p1, p2) = tl[pos]
                            if t == 'literal':
                                env['c_qso_rmks'] = p2
                                pos += 1
                        state = NORM
                        continue
                    env['errno'].append((lc, pos, 'Unknown literal: '+p2))
                    pos += 1
                    state = NORM
                    continue
                elif state == FREQ:
                    if t == 'freq':
                        env['c_freq'] = p2
                        (f, _, b) = freq_to_band(p2)
                        if f == 'Out of the band':
                            env['errno'].append((lc, pos, 'Out of the band.'))
                        env['c_band'] = b
                        pos+=1
                        state = NORM
                        continue
                    else:
                        state = NORM
                        continue
                elif state == RSTS:
                    if t == 'dec':
                        if p1 == 1:
                            env['c_s_s'] = int(p2)
                            pos += 1
                            state = RSTR
                            continue
                        elif p1 == 2:
                            env['c_r_s'] = int(p2)//10
                            env['c_s_s'] = int(p2)%10
                            pos += 1
                            state = RSTR
                            continue
                        elif p1 == 3:
                            env['c_r_s'] = int(p2)//100
                            env['c_s_s'] = (int(p2)%100)//10
                            env['c_t_s'] = int(p2)%10
                            pos += 1
                            state = RSTR
                            continue
                        else:
                            env['errno'].append((lc,pos,'Wrong RST format.'))
                            state = NORM
                            continue
                    elif t == 'snr':
                        env['c_snr_s'] = p1
                        pos += 1
                        state = RSTR
                        continue
                    else:
                        state = NORM
                        continue
                elif state == RSTR:
                    state = NORM
                    if t == 'dec':
                        if p1 == 1:
                            env['c_s_r'] = int(p2)
                            pos += 1
                            continue
                        elif p1 == 2:
                            env['c_r_r'] = int(p2)//10
                            env['c_s_r'] = int(p2)%10
                            pos += 1
                            continue
                        elif p1 == 3:
                            env['c_r_r'] = int(p2)//100
                            env['c_s_r'] = (int(p2)%100)//10
                            env['c_t_r'] = int(p2)%10
                            pos += 1
                            continue
                        else:
                            env['errno'].append((lc,pos,'Wrong RST format.'))
                    elif t == 'snr':
                        env['c_snr_r'] = p1
                        pos += 1
                    continue
            lc+=1
        if env['c_call'] != '':
            if conv_mode : # GenerateLog
                rt = modes_sig(env['c_mode'])
                if rt == 'rst':
                    rsts = '{}{}{}'.format(env['c_r_s'],env['c_s_s'],env['c_t_s'])
                    rstr = '{}{}{}'.format(env['c_r_r'],env['c_s_r'],env['c_t_r'])
                elif rt == 'rs':
                    rsts = '{}{}'.format(env['c_r_s'],env['c_s_s'])
                    rstr = '{}{}'.format(env['c_r_r'],env['c_s_r'])
                elif rt == 'snr':
                    rsts = env['c_snr_s']
                    rstr = env['c_snr_r']

                trans_tz(env)

                if ctstfl and not env['c_my_num']:
                    env['errno'].append((lc,pos,f"No Contest # from {env['c_call']}."))
                    
                qso = {
                    'mycall': env['mycall'],
                    'year':env['utc_year'],
                    'month':env['utc_month'],
                    'day':env['utc_day'],
                    'hour':env['utc_hour'],
                    'min':env['utc_min'],
                    'callsign':env['c_call'],
                    'band':env['c_band'],
                    'freq':env['c_freq'],
                    'mode':env['c_mode'],
                    'rigset':env['c_rigset'],
                    'rst_sent': rsts,
                    'rst_rcvd': rstr,
                    'his_num': env['c_his_num'],
                    'my_num': env['c_my_num'],
                    'mysota':env['mysota'],
                    'hissota':env['c_his_sota'],
                    'mywwff':env['mywwff'],
                    'hiswwff':env['c_his_wwff'],
                    'mypota':env['mypota'],
                    'hispota':env['c_his_pota'],
                    'operator':env['operator'],
                    'qsomsg':env['c_qso_msg'],
                    'qsormks':env['c_qso_rmks'],
                    'qslmsg':env['qslmsg']
                }
                hamlogqso = []
                (_, _, qth, qsl) = compose_qsl_msg(qso, env);
                if len(qth)> 56: #28
                    env['errno'].append((lc-2,pos,'QTH too long: ' + qth))
                if len(qsl)> 54:
                    env['errno'].append((lc-1,pos,'Remarks2 too long: ' + qsl))
                
            else: #Online
                mycall = env['mycall']
                call = env['c_call']

                trans_tz(env)
                date = '{y:02}-{m:02}-{d:02}'.format(y=env['utc_year'],m=env['utc_month'],d=env['utc_day'])
                time = '{h:02}:{m:02}'.format(h=env['utc_hour'],m=env['utc_min'])

                band = env['c_band']
                mode = env['c_mode']
                rt = modes_sig(mode)
                if rt == 'rst':
                    rsts = '{}{}{}'.format(env['c_r_s'],env['c_s_s'],env['c_t_s'])
                    rstr = '{}{}{}'.format(env['c_r_r'],env['c_s_r'],env['c_t_r'])
                elif rt == 'rs':
                    rsts = '{}{}'.format(env['c_r_s'],env['c_s_s'])
                    rstr = '{}{}'.format(env['c_r_r'],env['c_s_r'])
                elif rt == 'snr':
                    rsts = env['c_snr_s']
                    rstr = env['c_snr_r']

                if ctstfl:
                    if env['c_his_num']:
                        rsts += ' ' + env['c_his_num']

                    if env['c_my_num']:
                        rstr += ' ' + env['c_my_num']
                    else:
                        env['errno'].append((lc,pos,f"No Contest # from {env['c_call']}."))
                    
                qsotmp = {
                    'mycall': env['mycall'],
                    'year':env['utc_year'],
                    'month':env['utc_month'],
                    'day':env['utc_day'],
                    'hour':env['utc_hour'],
                    'min':env['utc_min'],
                    'callsign':env['c_call'],
                    'band':env['c_band'],
                    'freq':env['c_freq'],
                    'mode':env['c_mode'],
                    'rigset':env['c_rigset'],
                    'rst_sent': rsts,
                    'rst_rcvd': rstr,
                    'mysota':env['mysota'],
                    'hissota':env['c_his_sota'],
                    'mywwff':env['mywwff'],
                    'hiswwff':env['c_his_wwff'],
                    'mypota':env['mypota'],
                    'hispota':env['c_his_pota'],
                    'operator':env['operator'],
                    'qsomsg':env['c_qso_msg'],
                    'qsormks':env['c_qso_rmks'],
                    'qslmsg':env['qslmsg']
                }
                (rmks, freq, qth, qsl) = compose_qsl_msg(qsotmp, env);
                if len(qth)> 56: #28
                    env['errno'].append((lc-2,pos,'QTH too long: ' + qth))
                if len(qsl)> 54:
                    env['errno'].append((lc-1,pos,'Remarks2 too long: ' + qsl))
                    
                mysota = env['mysota']
                hissota = env['c_his_sota']
                myref = ''
                hisref =''
                if potafl:
                    myref = '/'.join(env['mypota'])
                    hisref = '/'.join(env['c_his_pota'])
                    prefix = '/'
                else:
                    prefix = ''
                    
                if wwfffl:
                    myref += prefix + env['mywwff']
                    if env['c_his_wwff'] != '':
                        hisref += prefix + env['c_his_wwff']

                if hissota:
                    topref = 'S2S'
                else:
                    topref = ''

                if hisref:
                    if topref:
                        topref +='/P2P'
                    else:
                        topref = 'P2P'
                        
                qsormks = get_ref(env['c_qso_rmks'])
                operator = env['operator']
                hisname = env['c_qso_msg']

                qso = [ str(qsoc), mycall, date, time, call, band, mode, rsts, rstr, mysota, hissota, myref, hisref, qsormks['LOC']+qsormks['SAT'], operator]
                hamlogqso = [ str(qsoc), call, date, time+'U', rsts, rstr, freq, mode, rmks['LOC_org'], hisname, qth, qsl]

            res.append(qso)
            hamlogres.append(hamlogqso)

    if conv_mode:
        if len(env['errno'])>0:
            now  = datetime.datetime.now()
            logname= now.strftime("%Y-%m-%d-%H-%M")
            err_log = "####FLE Interpretation Error####\n"
            errors = env['errno']
            lines = input_text.splitlines()
            lc = 0
            for l in lines:
                e = findErrors(lc,errors)
                if e:
                    err_log = err_log + l + " #--- Error! "+ e + "\n"
                else:
                    err_log = err_log + l + "\n"
                lc += 1
            files = {
                "fle-error-" + logname + ".txt" : err_log
            }
            return writeZIP(files)
        
        else:
            now  = datetime.datetime.now()
            fname = "fle-" + now.strftime("%Y-%m-%d-%H-%M")
            aday = '{}{:02}{:02}'.format(env['year'],env['month'],env['day'])
            logname= aday + '@' + env['mysota'].replace('/','-')+'-'.join(env['mypota'])+env['mywwff']
            files = {
                "fle-" + logname + ".txt" :input_text,
                "hamlog-" + logname + ".csv" : sendHamlog_FLE(res,env),
                "airham-" + logname + ".csv" : sendAirHam_FLE(res,env)
            }
            
            if sotafl:
                files = sendSOTA_FLE(files,res)

            if wwfffl:
                files = sendADIF_FLE(files, res, env['mycall'], 'WWFF', env['mywwff'])

            if potafl:
                for mysiginfo in env['mypota']:
                    files = sendADIF_FLE(files, res, env['mycall'], 'POTA', mysiginfo)

            if (not sotafl) and (not wwfffl) and (not potafl):
                files = sendSOTA_FLE(files,res)

            if ctstfl:
                files = sendZLOG_FLE(files,res)
            
            #print (files)
            return writeZIP(files)
    else:
        if len(env['errno'])>0:
            status ='ERR'
            logtype = 'NONE'
            errors = env['errno']
            lines = input_text.splitlines()
            lc = 0
            res = []
            hamglogres = []
            for l in lines:
                e = findErrors(lc,errors)
                if e:
                    res.append([str(lc),e, l])
                    hamlogres.append([str(lc),e, l])
                else:
                    res.append([str(lc),"", l])
                    hamlogres.append([str(lc),"", l])
                lc += 1
        else:
            status = 'OK'
            if sotafl and ( wwfffl or potafl):
                logtype = 'BOTH'
            elif sotafl:
                logtype = 'SOTA'
            elif wwfffl or potafl:
                logtype = 'WWFF'
            else:
                logtype = 'NONE'

        logtext = res
        hamlogtext = hamlogres
        errmsg = env['errno']
        
        res = {'status': status,
               'logtype': logtype,
               'mycall':env['mycall'],
               'operator':env['operator'],
               'mysota':env['mysota'],
               'mywwff':env['mywwff'],
               'qslmsg':env['qslmsg'],
               'logtext': logtext,
               'hamlogtext':hamlogtext
        }
        return (res)
    
def findErrors(lc,err):
    for e in err:
        (l,c,msg) = e
        if lc == l:
            return msg
    return None

def toSOTAFLE(h):
    date = '{day:02}/{month:02}/{year:02}'.format(
        day=h['day'], month=h['month'], year=h['year'])

    date2 = '{year:02}{month:02}{day:02}'.format(
        day=h['day'], month=h['month'], year=h['year'])

    f =band_to_freq(h['band'],is_sota = True)
    rmks = get_ref(h['qsormks'])
    l = [
        "V2",
        h['mycall'],
        h['mysota'],
        date,
        '{hour:02}:{minute:02}'.format(hour=h['hour'], minute=h['min']),
        f,
        mode_to_SOTAmode(h['mode']),
        h['callsign'],
        h['hissota'],
        rmks['LOC']+rmks['SAT']
    ]
    return (date2,h['mysota']!=''and h['hissota']!='',l)

def sendSOTA_FLE(files, loginput):
    prefix = 'sota'
    prefix2 = 'sota-s2s-'
    fname = ''
    linecount = 0

    outstr = io.StringIO()
    writer = csv.writer(outstr,delimiter=',',
                        quoting=csv.QUOTE_MINIMAL)
    outstr_s2s = io.StringIO()
    writer_s2s = csv.writer(outstr_s2s,delimiter=',',
                            quoting=csv.QUOTE_MINIMAL)

    for row in loginput:
        if linecount > 100000:
            break
        else:
            (fn,s2s,l) = toSOTAFLE(row)
            if linecount == 0:
                fname = fn
                
            if fn == fname:
                writer.writerow(l)
                if s2s:
                    writer_s2s.writerow(l)
                linecount += 1
            else:
                name = prefix + fname + '.csv'
                files.update({name : outstr.getvalue()})

                s2sbuff = outstr_s2s.getvalue()
                if len(s2sbuff) >0:
                    name2 = prefix2 + fname + '.csv'
                    files.update({name2 : s2sbuff})
                        
                outstr = io.StringIO()
                writer = csv.writer(outstr,delimiter=',',
                                        quoting=csv.QUOTE_MINIMAL)
                writer.writerow(l)

                outstr_s2s = io.StringIO()
                writer_s2s = csv.writer(outstr_s2s,delimiter=',',
                                        quoting=csv.QUOTE_MINIMAL)
                if s2s:
                    writer_s2s.writerow(l)
                fname = fn

    name = prefix + fname + '.csv'
    files.update({name : outstr.getvalue()})

    s2sbuff = outstr_s2s.getvalue()
    if len(s2sbuff) >0:
        name2 = prefix2 + fname + '.csv'
        files.update({name2 : s2sbuff})

    return(files)

def toADIF_FLE(h, mysig, mysiginfo, hissigl):
    date = '{year:02}{month:02}{day:02}'.format(
        day=h['day'], month=h['month'], year=h['year'])

    (mode, smode) = mode_to_ADIFmode(h['mode'])
    if hissigl:
        l = []
        for hissig in hissigl:
            l += [[
                adif('activator',h['mycall']),
                adif('callsign',h['callsign']),
                adif('date',date),
                adif('time',
                     '{hour:02}{minute:02}'.format(
                         hour=h['hour'], minute=h['min'])),
                adif('band-wlen',h['band']),
                adif('mode', mode),
                adif('rst_sent',h['rst_sent']),
                adif('rst_rcvd',h['rst_rcvd']),
                adif('mysig',mysig),
                adif('mysiginfo',mysiginfo),
                adif('sig',mysig),adif('siginfo', hissig),
                adif('operator',h['operator']),'<EOR>']]       
    else:
        l = [
            [adif('activator',h['mycall']),
            adif('callsign',h['callsign']),
            adif('date',date),
            adif('time',
                 '{hour:02}{minute:02}'.format(
                     hour=h['hour'], minute=h['min'])),
            adif('band-wlen',h['band']),
            adif('mode', mode),
            adif('rst_sent',h['rst_sent']),
            adif('rst_rcvd',h['rst_rcvd']),
            adif('mysig',mysig),
            adif('mysiginfo',mysiginfo),
            adif('operator',h['operator']),'<EOR>']]       
    
    return (date, l)

def sendADIF_FLE(files, loginput, callsign, mysig, mysiginfo):
    outstr = io.StringIO()
    linecount = 0
    fname = ''
    writer = csv.writer(outstr, delimiter=' ',
                        quoting=csv.QUOTE_MINIMAL)
    header = 'ADIF Export from HAMLOG by JL1NIE\n' + adif('programid','FCTH')+ '\n' + adif('adifver','3.1.4')+'\n' + '<EOH>\n'

    date = ''

    for row in loginput:
        if linecount > 100000:
            break
        else:
            if mysig == 'POTA':
                (d, l) = toADIF_FLE(row, mysig, mysiginfo, row['hispota'])
            elif mysig == 'WWFF':
                (d, l) = toADIF_FLE(row, mysig, mysiginfo, row['hiswwff'])
                
            if not date:
                date = d
                
            fn = callsign.replace('/','-') + '@' + mysiginfo + '-'+ date +'.adi'
                
            if linecount == 0:
                fname = fn

            if fn == fname:
                for r in l:
                    writer.writerow(r)
            else:
                if fname in files:
                    newstr = files[fname] + outstr.getvalue()
                else:
                    newstr = header + outstr.getvalue()

                files.update({fname : newstr })
                outstr = io.StringIO()
                writer = csv.writer(outstr,delimiter=' ',
                                    quoting=csv.QUOTE_MINIMAL)
                fname = fn
                for r in l:
                    writer.writerow(r)
                    
        linecount += 1

    if fname != '':
        if fname in files:
            newstr = files[fname] + outstr.getvalue()
        else:
            newstr = header + outstr.getvalue()
        files.update({fname : newstr })

    return files

def sendZLOG_FLE(files, loginput):
    outstr = io.StringIO()
    linecount = 0
    fname = ''
    writer = csv.writer(outstr, delimiter='\t',
                        quoting=csv.QUOTE_MINIMAL)
    header = ['DATE','TIME','BAND','MODE','CALLSIGN','SENTNo','RCVNo']
    date = ''

    for h in loginput:
        if linecount > 100000:
            break
        else:
            d = '{year:02}{month:02}{day:02}'.format(
                day=h['day'], month=h['month'], year=h['year'])

            l = [
                f"{h['year']}-{h['month']}-{h['day']}",
                f"{h['hour']:02}:{h['min']:02}",
                h['freq'].replace('MHz',''),
                h['mode'],
                h['callsign'],
                h['rst_sent'],
                h['his_num'],
                h['rst_rcvd'],
                h['my_num']]


            if not date:
                date = d
                
            fn = 'contest-'+ date +'.txt'
                
            if linecount == 0:
                writer.writerow(header)
                fname = fn
            writer.writerow(l)

        linecount += 1

    files.update({fname : outstr.getvalue()})
    return files

def compose_qsl_msg(h,env):

    if h['freq'] != '':
        f = re.sub(r'MHz','',h['freq'])
    else:
        f = re.sub(r'MHz','',band_to_freq(h['band']))

    hisref = []
    if h['hissota'] != '':
        hisref.append(h['hissota'])
        
    if h['hiswwff'] != '':
        hisref.append(h['hiswwff'])

    if h['hispota'] != []:
        hisref.append(",".join(h['hispota']))
    
    rmks = get_ref(h['qsormks'])

    qslmsg = h['qslmsg']

    if rmks['SAT_oscar'] != '':
        qslmsg = qslmsg.replace('$sat','via '+rmks['SAT_oscar'])
        antsat='STS'
    else:
        qslmsg = qslmsg.replace('$sat','')
        antsat='ST'
    if rmks['SAT_down'] != '':
        f = f + '/' + re.sub(r'MHz', '',rmks['SAT_down'])
        
    if '$rig' in qslmsg:
        qslmsg = qslmsg.replace('$rig','')    
        rig = 'Rig='+ h['band'] + antsat
        if h['rigset'] > 0:
            rig = rig + str(h['rigset'])
    else:
        rig = ''

    qthstr = rmks['ORG']+ ' '+ ",".join(hisref)

    qthstr = qthstr.strip()
    qslmsg = '%'+ qslmsg + '%' + rig
        
    return (rmks, f, qthstr, qslmsg)
            
def toHamlog_FLE(h,env):
    date = '{year:02}/{month:02}/{day:02}'.format(
        day=h['day'], month=h['month'], year=h['year']%100)


    (rmks ,f , qthstr, qslmsg) = compose_qsl_msg(h, env)
        
    l = [
        h['callsign'],
        date,
        '{hour:02}:{minute:02}U'.format(hour=h['hour'], minute=h['min']),
        h['rst_sent'],
        h['rst_rcvd'],
        f,
        h['mode'],
        '',
        rmks['LOC_org'],
        '',
        h['qsomsg'],
        qthstr,
        '',
        qslmsg,
        '0'
        ]
    
    return (l)

def sendHamlog_FLE(loginput, env):
    raw = io.BytesIO()
    outstr =io.TextIOWrapper(io.BufferedWriter(raw),
                             encoding='cp932',errors="backslashreplace")
    linecount = 0
    writer = csv.writer(outstr, delimiter=',',
                        quoting=csv.QUOTE_NONNUMERIC)
    for row in loginput:
        if linecount > 100000:
            break
        else:
            l = toHamlog_FLE(row, env)
            writer.writerow(l)
            linecount += 1

    outstr.flush()
    return (raw.getvalue())

def toAirHamFLE(lcount, h, env):
    if lcount == 0:
        l= ["id","callsign","portable","qso_at","sent_rst",
            "received_rst","sent_qth","received_qth",
            "received_qra","frequency","mode","card",
            "remarks"]
        return l

    tstr ="{year:04}/{month:02}/{day:02} {hour:02}:{min:02} +0000".format(year=h['year'],month=h['month'],day=h['day'],hour=h['hour'],min=h['min'])
    atime = datetime.datetime.strptime(tstr,'%Y/%m/%d %H:%M %z')
    utime = atime.astimezone(datetime.timezone(datetime.timedelta(hours=0)))
    isotime = atime.isoformat()
    
    (operator, portable) = splitCallsign(h['callsign'])
    
    freq = band_to_freq(h['band'])
    freq_dec = re.sub(r'[MHz|KHz|GHz]','',freq)
    mode = mode_to_airhammode(h['mode'], freq_dec)

    hisref = []
    if h['hissota'] != '':
        hisref.append(h['hissota'])
        
    if h['hiswwff'] != '':
        hisref.append(h['hiswwff'])

    if h['hispota'] != []:
        hisref.append(",".join(h['hispota']))
                                         
    l = ["",
         operator,
         portable,
         isotime,
         h['rst_sent'],
         h['rst_rcvd'],
         env['qslmsg'],
         ",".join(hisref)+' '+h['qsormks'],
         h['qsomsg'],
         freq,
         mode,
         "",
         ""
        ]
    return l

def sendAirHam_FLE(loginput, env):
    raw = io.BytesIO()
    outstr =io.TextIOWrapper(io.BufferedWriter(raw),
                             encoding='utf-8',errors="backslashreplace")
    linecount = 0
    writer = csv.writer(outstr, delimiter=',',
                        quoting=csv.QUOTE_MINIMAL)
    for row in loginput:
        if linecount > 100000:
            break
        else:
            if linecount == 0:
                writer.writerow(toAirHamFLE(linecount, row, env))
                linecount += 1
            writer.writerow(toAirHamFLE(linecount, row, env))
            linecount += 1

    outstr.flush()
    return (raw.getvalue())

def do_command(command, arg):
    res = {'status': "None" }
    if command == "interp":
        res = compileFLE(arg, False)
    return res
        
def fleonline():
    logger = logging.getLogger("FLEOnline")
    logging.basicConfig(level=logging.ERROR)

    form = cgi.FieldStorage()

    command = form.getvalue('command',None)
    arg = form.getvalue('arg',json.dumps("None"))
    text = form.getvalue('edittext',None)
        
    try:
        if command:
            if len(arg) < 131072:
                return do_command(command,arg)
            else:
                return None
        elif text:
                return compileFLE(text, True)
            
    except Exception as e:
        logger.error("fleonline",exc_info=True)
        logger.error("text={text}")
        
if __name__ == '__main__':
    fleonline()
