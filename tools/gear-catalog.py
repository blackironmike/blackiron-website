#!/usr/bin/env python3
"""
gear-catalog.py
One product list, rendered into two pages:

  gear.html      the full Storefront, every shelf
  programs.html  two mini shops (supplements, meal prep) in the
                 nutrition coaching section

The 1st Phorm catalog index lives in tools/phorm-catalog.json.

Run it after editing PRODUCTS or SHELVES:

    python3 tools/gear-catalog.py

It rewrites only the HTML between the GEAR:* marker comments, so the rest of
each page is untouched. Nothing here runs at build time; the output is
committed like any other page edit.

Sources
  impact  Impact.com partner programs. Photo and tracking link come straight
          from the brand's Impact catalog, so the commission is tracked to
          the Black Iron Athletics account.
  direct  Brand programs we hold outside Impact (Thorne dispensary, 1st Phorm
          Legionnaire).
  amazon  Amazon Associates. Amazon's rules say product photos and prices
          must come from their API and be refreshed within 24 hours, so these
          tiles ship with a name and a tagged link only. /api/gear-amazon
          fills in the photo and price in the browser.

Copy rules for blurbs: what the product is for and who it suits. Never claim
Mike owns or uses something unless "pick" is set and that is true. Supplement
copy stays structure and function (supports, helps maintain), never a
disease or treatment claim.
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
AMAZON_TAG = 'blackironathletics-20'
EDC = 'https://everydadcarry.com/gear/'
PHORM_AID = 'wu74bzpq2iyrz'


def phorm(handle):
    return f'https://1stphorm.com/products/{handle}/?a_aid={PHORM_AID}'


def phorm_img(file):
    return f'https://cdn.shopify.com/s/files/1/0072/7754/3493/files/{file}'


def tl(handle):
    return 'https://transparentlabs.sjv.io/c/7701857/1281413/15725?u=' + quote(f'https://www.transparentlabs.com/products/{handle}', safe='')


def tl_img(file):
    return f'https://cdn.shopify.com/s/files/1/0866/7664/files/{file}'


def beam(handle):
    return 'https://beam.sjv.io/c/7701857/1111247/14102?u=' + quote(f'https://shopbeam.com/products/{handle}', safe='')


def beam_img(file):
    return f'https://cdn.shopify.com/s/files/1/0264/4076/1399/files/{file}'


def swol(sku, handle):
    return (f'https://swolverine.sjv.io/c/7701857/3257284/41450?prodsku={sku}&u='
            + quote(f'https://swolverine.com/products/{handle}', safe=''))


def swol_img(file):
    return f'https://cdn.shopify.com/s/files/1/1283/2557/files/{file}'



# ---------------------------------------------------------------------------
# Products. Keys:
#   id, shelf, group (optional sub-heading inside a shelf), src, brand, name,
#   blurb, url, img (impact/direct), asin (amazon), pick (coach pick badge,
#   only when true), kw (extra search words), edc (Every Dad Carry review
#   slug), cta (button label brand, defaults to brand)
# ---------------------------------------------------------------------------
P = []
def add(**k):
    P.append(k)

# ---- GYM BAG: what you wear and carry in class ----------------------------
add(id='iron-bull-sleeves', budget=True, shelf='gym-bag', group='Belts, sleeves and wraps', src='amazon', brand='Iron Bull Strength',
    name='7mm knee sleeves', asin='B07B45BP44',
    blurb='Warmth and a little support for heavy squat days. Size by the chart, not by feel.',
    kw='knee sleeves squat support compression neoprene')
add(id='gymreapers-wraps', shelf='gym-bag', group='Belts, sleeves and wraps', src='amazon', brand='Gymreapers',
    name='18 inch wrist wraps', asin='B07BSRNCN3',
    blurb='For heavy presses and front rack work. Keep them in the bag for your top sets, not every set.',
    kw='wrist wraps press bench front rack')
add(id='phorm-belt', shelf='gym-bag', group='Belts, sleeves and wraps', src='direct', brand='1st Phorm',
    name='Leather lifting belt', url=phorm('1st-phorm-leather-lifting-belt'),
    img=phorm_img('1stphorm_accessories_liftingbelt_1stphormleatherliftingbelt_camo_0001.jpg'),
    blurb='A belt for when your squat and deadlift outgrow bracing alone. Learn to brace first, then add the belt.',
    kw='belt lifting weightlifting powerlifting leather')
add(id='adidas-powerlift', splurge=True, shelf='gym-bag', group='Shoes', src='amazon', brand='adidas',
    name='Powerlift 5 lifting shoes', asin='B0F4WPQ1MZ',
    blurb='A raised heel and a flat, hard sole. The quickest fix for a squat that tips forward.',
    kw='lifting shoes weightlifting squat shoes heel')
add(id='nike-metcon', shelf='gym-bag', group='Shoes', src='amazon', brand='Nike',
    name='Metcon 9 training shoes', asin='B0D95KVSW2',
    blurb='One shoe for lifting, rowing, rope climbs and short runs. The most common shoe on our floor.',
    kw='training shoes cross training metcon sneakers')
add(id='jerkfit-grips', shelf='gym-bag', group='Grips, straps and ropes', src='amazon', brand='JerkFit',
    name='Raw Grips 3.0', asin='B07DR7VPRZ',
    blurb='Two-finger leather grips for pull-ups and toes-to-bar, so a big gymnastics day does not cost you your hands.',
    kw='grips gymnastics pull ups hand protection gloves')
add(id='gymreapers-straps', shelf='gym-bag', group='Grips, straps and ropes', src='amazon', brand='Gymreapers',
    name='Lifting straps', asin='B07BB3VQ42',
    blurb='For heavy pulls when your grip quits before your back does. Train grip too, just not on your top set.',
    kw='lifting straps deadlift grip')
add(id='bear-komplex-rope', budget=True, shelf='gym-bag', group='Grips, straps and ropes', src='amazon', brand='Bear KompleX',
    name='Speed jump rope', asin='B0D6XF6K3Y',
    blurb='Ball bearing handles and an adjustable cable. The rope you learn double-unders on.',
    kw='jump rope speed rope double unders')
add(id='511-duffel', shelf='gym-bag', group='Bags', src='impact', brand='5.11 Tactical',
    name='PT-R Daily Grind duffel 32L',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=198900106776&u=https%3A%2F%2Fwww.511tactical.com%2Fpt-r-daily-grind-duffel.html%3Fsku%3D198900106776%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/opemc7tmbv/webp/56856ABR_701_03.webp',
    blurb='Shoes, belt, sleeves and a change of clothes, with a pocket that keeps the sweaty stuff apart.',
    kw='gym bag duffel bag 511')
add(id='511-trainer-bag', splurge=True, shelf='gym-bag', group='Bags', src='impact', brand='5.11 Tactical',
    name='Range Ready trainer bag 50L',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=888579885163&u=https%3A%2F%2Fwww.511tactical.com%2Frange-ready-trainer-bag.html%3Fsku%3D888579885163%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/n1cyct90rn/webp/56567_019_RangeReadyTrainerBag_05.webp',
    blurb='The bigger option for people who bring everything: lifting shoes, a jump rope, a belt and lunch.',
    kw='gym bag trainer bag 511 backpack')

# ---- WATCHES ----------------------------------------------------------------
SUUNTO = 'https://suunto.pxf.io/c/7701857/2975536/35454?prodsku={sku}&u=https%3A%2F%2Fus.suunto.com%2Fproducts%2F{h}&intsrc=APIG_23878'
SUUNTO_IMG = 'https://cdn.shopify.com/s/files/1/0645/6488/7733/files/'
add(id='suunto-run', shelf='watches', group='GPS watches', src='impact', brand='Suunto', name='Suunto Run',
    url=SUUNTO.format(sku='51258879148213', h='suunto-run-all-black'),
    img=SUUNTO_IMG + 'Suunto_Run-ALL_BLACK-Front-ALL_BLACK-watchface_EN.png',
    blurb='A light, simple GPS watch for steps, runs and heart rate. The easy starting point.',
    kw='watch gps running heart rate tracker')
add(id='suunto-race-s', shelf='watches', group='GPS watches', src='impact', brand='Suunto', name='Suunto Race S',
    url=SUUNTO.format(sku='44418070544565', h='suunto-race-s-all-black'),
    img=SUUNTO_IMG + 'image1_6afcde1b-eeab-42ec-bafd-414bf72faaeb.png',
    blurb='Training load, recovery and sleep tracking in a smaller case. Plenty for most people who train hard.',
    kw='watch gps training recovery sleep')
add(id='suunto-race-2', splurge=True, shelf='watches', group='GPS watches', src='impact', brand='Suunto', name='Suunto Race 2',
    url=SUUNTO.format(sku='51576811159733', h='suunto-race-2-all-black'), edc='suunto-race-2',
    img=SUUNTO_IMG + 'Suunto_Race2-AllBlack-Front-AllBlack-watchface-c40-sailfish_EN.png',
    blurb='The full-size version, with a bigger screen and a longer battery for long weeks and long events.',
    kw='watch gps race battery')
add(id='suunto-hr-belt', shelf='watches', group='Heart rate', src='impact', brand='Suunto', name='Smart heart rate belt',
    url=SUUNTO.format(sku='44247915757749', h='suunto-smart-heart-rate-belt'),
    img=SUUNTO_IMG + 'ss050579000-suunto_smart_heart_rate_belt_04.png',
    blurb='A chest strap reads heart rate more accurately than a wrist does during intervals and lifting.',
    kw='heart rate monitor chest strap')

# ---- SUPPLEMENTS ------------------------------------------------------------
add(id='thorne-creatine', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Creatine', url='https://s.thorne.com/ivqHX', pick=True,
    img='/images/gear/thorne-creatine-product.webp', edc='thorne-creatine',
    blurb='Five grams a day. Supports strength and power output. The one we stock.',
    kw='creatine monohydrate strength power')
add(id='thorne-whey', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Whey Protein Isolate', url='https://s.thorne.com/gOquC',
    img='/images/gear/thorne-whey-protein-isolate-product.webp', edc='thorne-whey-protein-isolate',
    blurb='For the days food alone does not get you to your protein number. Mixes clean.',
    kw='protein powder whey isolate shake')
add(id='phorm-level-1', shelf='supplements', group='The daily basics', src='direct', brand='1st Phorm',
    name='Level-1 protein', url=phorm('level-1'), pick=True, edc='first-phorm-level-1',
    img=phorm_img('level-1-birthday-cake.png'),
    blurb='A slower protein that sits like a meal. Good for the gap between lunch and an evening class.',
    kw='protein powder meal replacement level 1')
add(id='tl-whey', shelf='supplements', group='The daily basics', src='impact', brand='Transparent Labs',
    name='Grass-fed whey isolate', url=tl('whey-protein-isolate'), edc='transparent-labs-grass-fed-whey-protein-isolate',
    img=tl_img('01_chocolate.png'),
    blurb='Grass-fed whey with a short ingredient list. Supports muscle recovery after training.',
    kw='protein powder whey isolate grass fed')
add(id='swol-creatine', budget=True, shelf='supplements', group='The daily basics', src='impact', brand='Swolverine',
    name='Creatine monohydrate', url=swol('39886005698638', 'creatine-monohydrate'),
    img=swol_img('CreatineMonohydrate-Front.webp'),
    blurb='Plain creatine, nothing added. Supports strength and power with daily use.',
    kw='creatine monohydrate')
add(id='thorne-basic-nutrients', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Basic Nutrients 2/Day', url='https://s.thorne.com/AHAyw', edc='thorne-basic-nutrients-2-day',
    img='/images/gear/thorne-basic-nutrients-2-day-product.webp',
    blurb='A two-capsule daily multivitamin. Supports energy metabolism and helps fill the gaps a busy week leaves.',
    kw='multivitamin multi vitamins daily')

add(id='c4-original', shelf='supplements', group='Before and during training', src='impact', brand='C4',
    name='C4 Original pre-workout', edc='c4-original-pre-workout',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=7359058477118&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fc4-original&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/C4AN_1002_Brand_C4YellowLabel_Transition_C4Original_CoreFlavors_BasicPDPs-OG-IBR-Hero-Grey.png',
    blurb='The classic pre-workout. Caffeine for energy and focus on the days the 5:30 alarm wins.',
    kw='pre workout preworkout energy caffeine c4')
add(id='swol-pre', shelf='supplements', group='Before and during training', src='impact', brand='Swolverine',
    name='PRE', url=swol('39274648698958', 'pre'), edc='swolverine-pre',
    img=swol_img('PRE-Mango-Front.webp'),
    blurb='A pre-workout built for endurance and focus. Supports performance through long sessions.',
    kw='pre workout preworkout energy')
add(id='tl-bulk', shelf='supplements', group='Before and during training', src='impact', brand='Transparent Labs',
    name='Bulk pre-workout', url=tl('bulk-preworkout'), edc='transparent-labs-bulk-pre-workout',
    img=tl_img('TL_Bulk_30S_BR_1_1_1defd9cb-a9d2-4603-9509-7b02cd578d47.png'),
    blurb='Fully disclosed doses, no proprietary blend. Supports energy and endurance for heavy days.',
    kw='pre workout preworkout energy')
add(id='phorm-project-1', shelf='supplements', group='Before and during training', src='direct', brand='1st Phorm',
    name='Project-1 pre-workout', url=phorm('project-1-pre-workout'),
    img=phorm_img('project-1-sweet-peach-caffeine.png'),
    blurb='Energy, focus and pump support in one scoop. Available caffeinated or stim-free.',
    kw='pre workout preworkout project 1')
add(id='swol-intra', shelf='supplements', group='Before and during training', src='impact', brand='Swolverine',
    name='INTRA', url=swol('6792916533326', 'intra'), edc='swolverine-intra',
    img=swol_img('Intra-Front.webp'),
    blurb='Amino acids and electrolytes to sip during long or hot sessions. Supports hydration and endurance.',
    kw='intra workout eaa bcaa electrolytes hydration')
add(id='xtend-bcaa', shelf='supplements', group='Before and during training', src='impact', brand='XTEND',
    name='XTEND Original BCAA',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=42684436283454&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fxtend-original%3Fvariant%3D42684436283454&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/XTEND_1144_Digital_Relabel_FlowThrough_Assets_PDPs_OnGreyBackground-XTEND-OG30-BRI.png',
    blurb='Branched-chain amino acids with electrolytes. Something with flavor to sip through a long session.',
    kw='bcaa amino intra workout')
add(id='phorm-hydration', shelf='supplements', group='Before and during training', src='direct', brand='1st Phorm',
    name='Hydration Sport', url=phorm('hydration-sport'),
    img=phorm_img('hydration-sticks-sport-salted-watermelon.png'),
    blurb='Electrolyte sticks for Texas summers and sweaty classes. Supports hydration.',
    kw='electrolytes hydration salt')
add(id='c4-energy', shelf='supplements', group='Before and during training', src='impact', brand='C4',
    name='C4 Performance Energy, 12 pack', edc='c4-performance-energy',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=39435514937406&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fc4-original-carbonated%3Fvariant%3D39435514937406&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/Cobrand_0410_CFS_DigitalRefresh_CFSLandingPage_PartnerLinkUpdates-Hero-Grey-V01.png',
    blurb='Zero sugar energy drink in a can. For people who would rather crack a can than mix a scoop.',
    kw='energy drink caffeine c4')

add(id='beam-dream', shelf='supplements', group='Sleep and recovery', src='impact', brand='Beam',
    name='Dream', url=beam('dream-powder-8'),
    img=beam_img('dream-og-shopall_fabaf99c-66b8-44ee-9db9-fa641f4935e5.jpg'),
    blurb='A warm nighttime drink with magnesium and other sleep-support ingredients. Supports restful sleep.',
    kw='sleep magnesium night recovery')
add(id='tl-sleep', shelf='supplements', group='Sleep and recovery', src='impact', brand='Transparent Labs',
    name='Sleep and Recover', url=tl('sleep-supplement'),
    img=tl_img('TL_SLEEP-RECOVER_120_1_1.png'),
    blurb='Capsules for the nights you want a little help winding down. Supports sleep quality.',
    kw='sleep recovery melatonin')
add(id='thorne-magnesium', shelf='supplements', group='Sleep and recovery', src='direct', brand='Thorne',
    name='Magnesium Bisglycinate', url='https://s.thorne.com/L38nt', edc='thorne-magnesium-bisglycinate',
    img='/images/gear/thorne-magnesium-bisglycinate-product.png',
    blurb='A gentle powdered magnesium for the evening. Supports muscle relaxation and restful sleep.',
    kw='magnesium sleep recovery')
add(id='tl-creatine-hmb', shelf='supplements', group='Sleep and recovery', src='impact', brand='Transparent Labs',
    name='Creatine HMB', url=tl('creatine-hmb'), edc='transparent-labs-creatine-hmb',
    img=tl_img('TL_CreatineHMB_30S_U_1_2.png'),
    blurb='Creatine paired with HMB. Supports strength and helps maintain lean muscle during a cut.',
    kw='creatine hmb strength')

# 1st Phorm best sellers. These render inside the 1st Phorm block at the
# bottom of the supplements shelf (render_phorm), not in a timing group:
# the block is for people who already buy the brand. Photos are the brand's
# own packshots from its Shopify CDN. Copy stays structure and function.
PH = '1st Phorm'
add(id='phorm-phormula-1', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Phormula-1 protein', url=phorm('phormula-1'), img=phorm_img('phormula-1-chocolate-milkshake.png'),
    blurb='Their whey isolate. Fast to digest, so it suits the shake right after class. Supports muscle recovery.',
    kw='protein powder whey isolate shake phormula')
add(id='phorm-micro-factor', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Micro Factor', url=phorm('micro-factor'), img=phorm_img('micro-factor_4c4cc124-073f-4ed5-8d93-6cc56ee24736.png'),
    blurb='Six daily basics in one packet: vitamins, minerals and more. Supports whole-body health for people who hate a pill drawer.',
    kw='multivitamin vitamins daily packet micro factor')
add(id='phorm-opti-greens', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Opti-Greens 50', url=phorm('opti-greens-50'), img=phorm_img('opti-greens-50-natural-berry-04_25.png'),
    blurb='A greens powder for the days the vegetables lose. Supports digestion and natural energy. Not a replacement for the vegetables.',
    kw='greens powder superfood opti greens')
add(id='phorm-creatine', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Micronized creatine', url=phorm('micronized-creatine-monohydrate'), img=phorm_img('creatine-100-serving.png'),
    blurb='Plain creatine monohydrate in 50 or 100 servings. Supports strength and power with daily use.',
    kw='creatine monohydrate micronized strength')
add(id='phorm-phormula-1-clear', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Phormula-1 Clear', url=phorm('phormula-1-clear'), img=phorm_img('Phormula-1_Clear_Cotton_Candy_-_WEB_3_1.png'),
    blurb='Whey isolate that drinks like juice instead of a milkshake. For people who cannot face a thick shake after a hot class.',
    kw='protein powder clear whey isolate')
add(id='phorm-eaa', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Essential amino acids', url=phorm('essential-amino-acids'), img=phorm_img('eaa-tropical-mango.png'),
    blurb='All nine essential aminos to sip during training. Supports muscle repair and hydration on long sessions.',
    kw='eaa amino acids intra workout')
add(id='phorm-hydration-daily', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Hydration Daily', url=phorm('hydration-daily'), img=phorm_img('hydration-daily-strawberry.png'),
    blurb='The everyday electrolyte stick, lighter than Hydration Sport. One in the water bottle on a normal day.',
    kw='electrolytes hydration daily sticks')
add(id='phorm-level-1-bars', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Level-1 protein bars', url=phorm('level-1-bar'), img=phorm_img('peanut-butter-lover-combo-pack.png'),
    blurb='20 grams of protein in a bar that lives in the gym bag. Two boxes of 15, mix the flavors.',
    kw='protein bar bars snack level 1')
add(id='phorm-opti-reds', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Opti-Reds 50', url=phorm('opti-reds-50'), img=phorm_img('opti-reds-50-04_25.png'),
    blurb='The reds version: fruits, vegetables and herbs in a scoop. Supports natural energy and circulation.',
    kw='reds powder superfood opti reds')
add(id='phorm-full-mega', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Full-Mega fish oil', url=phorm('full-mega'), img=phorm_img('full-mega_c02f96b0-75bf-4b69-bd65-b0333adde28d.png'),
    blurb='Omega-3 softgels with real amounts of EPA and DHA. Supports heart and brain health.',
    kw='fish oil omega 3 epa dha')
add(id='phorm-daily-stack', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='The Daily Stack', url=phorm('the-daily-stack'), img=phorm_img('daily-stack-03_25.png'),
    blurb='Micro Factor and Opti-Greens 50 together, for people who want both and one checkout.',
    kw='stack bundle micro factor opti greens daily')
add(id='phorm-joint-mobility', shelf='supplements', group=PH, src='direct', brand='1st Phorm',
    name='Joint Mobility', url=phorm('joint-mobility'), img=phorm_img('joint-mobility_97703ed0-7288-4f6b-bb54-641d1dce437a.png'),
    blurb='For people who train hard and feel it in their joints. Supports joint comfort and healthy connective tissue.',
    kw='joint mobility joints cartilage')

# ---- MEAL PREP --------------------------------------------------------------
add(id='trifecta-lean', cover=True, shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Get Lean meal plan', edc='trifecta-meal-delivery',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=GLM1000&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-plans%2Fget-lean-meal-plan%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2024/11/07151512/PL0043CX-001-2.jpg',
    blurb='Portioned, macro-counted meals delivered weekly. The easiest way to hit your numbers in a busy week.',
    kw='meal delivery meal plan prepared meals macros trifecta')
add(id='trifecta-build', cover=True, shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Protein Build meal plan',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=PBM1000&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-plans%2Fprotein-build-meal-plan%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2024/12/02112611/PM0006CX-002-2.jpg',
    blurb='Bigger, higher-protein portions for a building phase. Same delivery, more food.',
    kw='meal delivery high protein meal plan trifecta')
add(id='fuel-meals', cover=True, shelf='meal-prep', group='Meals made for you', src='impact', brand='Fuel Meals',
    name='Fuel Meals', url='https://fuel-meals.pxf.io/c/7701857/1513985/17798',
    img='https://www.fuelmeals.com/social-share.jpg',
    blurb='Chef-made, high-protein meals built to your macros, shipped fresh. Pick your meals each week.',
    kw='meal delivery prepared meals macros fuel meals')
add(id='trifecta-chicken', cover=True, shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Sous vide chicken breast, a la carte',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=MP0002CX&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-prep%2Fprotein%2Fgrilled-chicken-breast%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2025/02/18115735/MP0002CX-003-1.jpg',
    blurb='Cooked protein by the pound. Pair it with your own rice and vegetables and the prep is half done.',
    kw='chicken protein bulk meal prep trifecta a la carte')

add(id='etekcity-scale', budget=True, shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Etekcity',
    name='Digital food scale', asin='B0113UZJE2', edc='etekcity-ek6015-food-scale',
    blurb='Grams and ounces with a tare button. The single most useful tool for learning what a portion looks like.',
    kw='food scale kitchen scale grams meal prep')
add(id='etekcity-scale-22', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Etekcity',
    name='22 lb rechargeable food scale', asin='B09HM2TN5Z',
    blurb='A bigger platform for weighing a whole batch, rechargeable, and it shrugs off a splash.',
    kw='food scale kitchen scale rechargeable batch')
add(id='rubbermaid-glass', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Rubbermaid',
    name='Brilliance glass containers, 9 piece', asin='B08BR9HBZ3',
    blurb='Oven, microwave and dishwasher safe, with lids that actually seal. Built for reheating a week of lunches.',
    kw='food storage containers glass meal prep')
add(id='komuee-glass', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='KOMUEE',
    name='30 oz glass meal prep containers, 10 pack', asin='B08X4615SC',
    blurb='Ten matching single-meal containers. One Sunday, ten meals, done.',
    kw='meal prep containers glass')
add(id='mcirco-divided', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='M MCIRCO',
    name='Two-compartment glass containers, 10 pack', asin='B0CP5VBGNM',
    blurb='Divided glass keeps the protein and the sides apart, which keeps portions honest.',
    kw='meal prep containers divided compartment glass')
add(id='rubbermaid-plastic', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Rubbermaid',
    name='Brilliance plastic containers, 14 piece', asin='B07X1TMQ34',
    blurb='Lighter than glass for the gym bag and the cooler, still leak-proof.',
    kw='food storage containers plastic meal prep')

# ---- RECOVERY AND MOBILITY -------------------------------------------------
# Heat and cold copy carries the safety line on purpose: a sauna tent and an
# ice tub are the two products on this page that can genuinely hurt somebody
# with a heart condition. Keep it.
HC = 'Heat and cold at home'
MOB = 'Mobility'
MASS = 'Massage and compression'
add(id='lifepro-sauna-blanket', budget=True, shelf='recovery', group=HC, src='amazon', brand='Lifepro',
    name='BioRemedy infrared sauna blanket', asin='B09Y9L7FJ8',
    blurb='The cheapest way into heat. Zips up like a sleeping bag and rolls into a closet when you are done.',
    kw='sauna blanket infrared heat budget sauna')
add(id='serenelife-sauna', splurge=True, shelf='recovery', group=HC, src='amazon', brand='SereneLife',
    name='Portable infrared sauna tent', asin='B07WC64NPQ',
    blurb='A sit-in infrared tent with a heated foot pad and a folding chair. Real sauna sessions for a few hundred dollars.',
    kw='sauna tent infrared portable home sauna')
add(id='pod-ice-pod', budget=True, shelf='recovery', group=HC, src='amazon', brand='The Pod Company',
    name='Ice Pod Pro cold plunge tub', asin='B0F74Q25ZR',
    blurb='An insulated pop-up tub that takes a bag of ice and a hose. The way to find out if cold plunging is for you.',
    kw='cold plunge ice bath tub budget plunge')
add(id='brisk-bear-tub', shelf='recovery', group=HC, src='amazon', brand='Brisk Bear',
    name='XL oval ice bath tub', asin='B0DJ6PNLNM',
    blurb='A longer oval tub for taller people who want to get their shoulders under. Comes with a cover.',
    kw='cold plunge ice bath tub xl tall')

add(id='ab-foam-roller', budget=True, shelf='recovery', group=MOB, src='amazon', brand='Amazon Basics',
    name='36 inch high-density foam roller', asin='B00XM2MRGI',
    blurb='Long enough for the upper back and the whole leg. If you only own one roller, own this one.',
    kw='foam roller mobility long roller')
add(id='triggerpoint-grid', shelf='recovery', group=MOB, src='amazon', brand='TriggerPoint',
    name='GRID foam roller', asin='B0040EGNIU', edc='triggerpoint-grid-1-foam-roller',
    blurb='Firmer and shorter. Small enough to live in the gym bag.',
    kw='foam roller mobility')
add(id='lacrosse-balls', budget=True, shelf='recovery', group=MOB, src='amazon', brand='Kieba',
    name='Lacrosse massage balls', asin='B017V7UKW2',
    blurb='The cheapest recovery tool that works. Feet, hips and upper back.',
    kw='lacrosse ball massage ball mobility')
add(id='peanut-ball', shelf='recovery', group=MOB, src='amazon', brand='5BILLION',
    name='Peanut massage ball', asin='B00Z65TBBI',
    blurb='Two balls joined in the middle, so it rolls either side of the spine instead of on it.',
    kw='peanut ball double lacrosse ball mobility spine')
add(id='fit-simplify-bands', budget=True, shelf='recovery', group=MOB, src='amazon', brand='Fit Simplify',
    name='Resistance loop bands, set of 5', asin='B01AVDVHTI',
    blurb='Mini bands for hip and shoulder warm-ups. The same thing we hand out before a squat day.',
    kw='bands mini bands loop bands warm up mobility')
add(id='optp-strap', shelf='recovery', group=MOB, src='amazon', brand='OPTP',
    name='Stretch Out strap', asin='B00065X222',
    blurb='A strap with loops, so you can stretch hamstrings and shoulders without needing a partner.',
    kw='stretching strap stretch mobility')
add(id='idson-stick', budget=True, shelf='recovery', group=MOB, src='amazon', brand='Idson',
    name='Muscle roller stick', asin='B015RKCWR6',
    blurb='A handheld roller for calves and quads. Easy to use while you watch TV.',
    kw='roller stick massage stick mobility calves')

add(id='theragun-relief', splurge=True, shelf='recovery', group=MASS, src='amazon', brand='Therabody',
    name='Theragun Relief', asin='B0DG6SX3VS', edc='theragun-relief',
    blurb='A simple, quiet massage gun. Ten minutes on the legs after a heavy lower day.',
    kw='massage gun percussion theragun')
add(id='merach-massage', budget=True, shelf='recovery', group=MASS, src='impact', brand='MERACH',
    name='Percussion massage gun',
    url='https://hongkongmerachtechnologycolimited.pxf.io/c/7701857/3281319/42158?prodsku=44590326743215&u=https%3A%2F%2Fmerachfit.com%2Fproducts%2Fpercussion-massage-tools-with-6-massage-heads-10mm-amplitude&intsrc=APIG_27151',
    img='https://cdn.shopify.com/s/files/1/0507/1611/5119/files/1_3481753e-1198-4942-88a7-8e4ab93f57f2.webp',
    blurb='Six heads and real amplitude for the price. The budget way into a massage gun.',
    kw='massage gun percussion')
add(id='normatec', splurge=True, shelf='recovery', group=MASS, src='amazon', brand='Hyperice',
    name='Normatec 3 compression boots', asin='B0B72QBWHC',
    blurb='Air compression boots for heavy training weeks. The splurge, for the person who has everything else.',
    kw='compression boots recovery normatec')

# ---- TREADMILLS AND CARDIO -------------------------------------------------
MERACH = 'https://hongkongmerachtechnologycolimited.pxf.io/c/7701857/3281319/42158?prodsku={sku}&u=https%3A%2F%2Fmerachfit.com%2Fproducts%2F{h}&intsrc=APIG_27151'
MCDN = 'https://cdn.shopify.com/s/files/1/0507/1611/5119/files/'
add(id='merach-t12-pro', shelf='cardio', group='Treadmills', src='impact', brand='MERACH', name='T12 Pro treadmill', pick=True,
    url=MERACH.format(sku='46446402863279', h='t12-pro-foldable-treadmill-with-15-auto-incline'), edc='merach-t12-pro-treadmill',
    img=MCDN + 'T12B4-T12FoldableTreadmillPro-hero-pic-1.jpg',
    blurb='The one in my garage. Folds up, 15 percent auto incline, and over a hundred miles in so far.',
    kw='treadmill walking incline folding t12')
add(id='merach-t31', splurge=True, shelf='cardio', group='Treadmills', src='impact', brand='MERACH', name='18% incline treadmill, 55 inch deck',
    url=MERACH.format(sku='46478505410735', h='merach-t31b3-treadmill-with-18-auto-incline'),
    img=MCDN + 'T31B3-AMZ_2.jpg',
    blurb='A longer, wider belt for real running, with an 18 percent incline for steep walks.',
    kw='treadmill running incline')
add(id='merach-r50', shelf='cardio', group='Rowers and bikes', src='impact', brand='MERACH', name='NovaRow R50 Pro air rower',
    url=MERACH.format(sku='44061212115119', h='novarow-r50-air-resistance-rower'),
    img=MCDN + '1_7.png',
    blurb='Air resistance like the rowers in class, so the harder you pull, the harder it gets.',
    kw='rower rowing machine air rower cardio')
add(id='merach-s28', shelf='cardio', group='Rowers and bikes', src='impact', brand='MERACH', name='S28 smart exercise bike',
    url=MERACH.format(sku='44590417936559', h='s28-smart-off-road-racing-bike-with-adjustable-incline-6'),
    img=MCDN + 'S28B1.jpg',
    blurb='Magnetic resistance and an app. Low-impact cardio for the days your joints want a break.',
    kw='bike exercise bike cycling cardio')

# ---- DESK SETUP -------------------------------------------------------------
add(id='uplift-v3', cover=True, shelf='desk', group='Desk and walking pad', src='impact', brand='UPLIFT Desk', name='V3 standing desk', pick=True,
    url='https://upliftdesk.sjv.io/c/7701857/2037399/22058?prodsku=UPL960-black-lam-60x24&u=http%3A%2F%2Fcheckout.upliftdesk.com%2F2-leg-standing-desk%2F&intsrc=APIG_17322',
    img='https://cdn11.bigcommerce.com/s-l85bzww3lo/products/890/images/38645/Final_MVT011_and_UPL964_Inclining_Walking_01496_2__22750.1787774251.1217.655.jpg',
    edc='uplift-v3-standing-desk',
    blurb='The desk I work at. Rock solid at standing height, which is the whole point.',
    kw='standing desk desk office uplift')
add(id='merach-w60', cover=True, shelf='desk', group='Desk and walking pad', src='impact', brand='MERACH', name='UltraWalk W60 walking pad',
    url=MERACH.format(sku='46969946472623', h='merach-ultrawalk-w60-walking-pad-treadmill-with-12-auto-incline-under-desk-walking-pad-400lb-capacity-max-3-5hp-heavy-duty-walking-pad-with-incline-for-tall-people-with-bt-speaker-rgb-light-app'),
    img=MCDN + 'w60-b2-amz-woman_1.png',
    blurb='Slides under a standing desk, with a 12 percent incline for walking through calls.',
    kw='walking pad under desk treadmill incline')
add(id='topo-mat', shelf='desk', group='Standing comfort', src='amazon', brand='Ergodriven', name='Topo standing mat',
    asin='B00V3TO9EK', edc='ergodriven-topo',
    blurb='Not flat on purpose. The bumps keep you shifting your weight, which keeps you standing longer.',
    kw='standing mat anti fatigue mat desk')
add(id='fezibo-board', shelf='desk', group='Standing comfort', src='amazon', brand='FEZIBO', name='Balance board',
    asin='B07HD838VP',
    blurb='A rocker board for the standing desk. Gives your legs something to do besides lock out.',
    kw='balance board standing desk wobble')

# ---- HOME GYM ---------------------------------------------------------------
add(id='kettlebell', budget=True, shelf='home-gym', group='Weights', src='amazon', brand='Amazon Basics', name='Cast iron kettlebell',
    asin='B0731FCS7T', edc='amazon-basics-cast-iron-kettlebell',
    blurb='If you only buy one weight for home, make it a kettlebell. Most people start around 16 kg.',
    kw='kettlebell weight home gym')
add(id='bowflex-552', splurge=True, shelf='home-gym', group='Weights', src='amazon', brand='Bowflex', name='SelectTech 552 dumbbells',
    asin='B0FRNG2N5H',
    blurb='A rack of dumbbells from 5 to 52.5 pounds in the corner of a room.',
    kw='adjustable dumbbells weights home gym')
add(id='511-vest', shelf='home-gym', group='Weights', src='impact', brand='5.11 Tactical', name='TacTec trainer weight vest',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=888579911763&u=https%3A%2F%2Fwww.511tactical.com%2Ftactec-trainer-weight-vest.html%3Fsku%3D888579911763%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/sfxnvwuk0j/webp/56693ABR_721_01.webp', edc='511-tactec-trainer-weight-vest',
    blurb='Turns a walk into training and a Murph into a Murph. Takes standard plates.',
    kw='weight vest murph rucking')
add(id='sunpow-bands', shelf='home-gym', group='Bodyweight', src='amazon', brand='SUNPOW', name='Pull-up assist bands, 5 pack',
    asin='B07K1823XB',
    blurb='Five levels of help for pull-ups, plus warm-ups and travel workouts.',
    kw='resistance bands pull up bands')
add(id='pullup-bar', budget=True, shelf='home-gym', group='Bodyweight', src='amazon', brand='Sportneer', name='Doorway pull-up bar',
    asin='B09JC86WNK',
    blurb='No drilling, adjustable width, and it holds more than you would think.',
    kw='pull up bar doorway chin up')

# ---------------------------------------------------------------------------
# Shelves, in page order. groups fixes the order of the subheadings, which is
# also the order they appear in the header directory. photo is the lifestyle
# image on the "Shop by collection" tile: our own photography wherever we have
# it, a brand photo only where we do not.
SHELVES = [
    dict(key='gym-bag', short='Gym bag', sub='What you wear and carry',
         h2='What people wear|to class.',
         lead='None of it is required on day one. When the weights get heavy and the gymnastics gets harder, this is the short list.',
         groups=['Shoes', 'Belts, sleeves and wraps', 'Grips, straps and ropes', 'Bags'],
         photo='/images/training/pullup-bar.webp'),
    dict(key='supplements', short='Supplements', sub='Thorne &middot; 1st Phorm &middot; Swolverine &middot; Transparent Labs &middot; C4 &middot; Beam',
         h2='Supplements,|sorted by timing.',
         lead='Food first. These fill the gaps. If you compete in a tested sport, check the label on the specific product before you buy it.',
         groups=['The daily basics', 'Before and during training', 'Sleep and recovery'],
         photo='/images/gear/thorne-creatine.jpg'),
    dict(key='meal-prep', short='Meal prep', sub='Trifecta &middot; Fuel Meals &middot; scales and containers',
         h2='Meal prep,|done for you or done yourself.',
         lead='Have the meals made, or make them on Sunday. Either way, a food scale is how you learn what a portion actually looks like.',
         groups=['Meals made for you', 'Prep it yourself'],
         photo='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2024/11/07151512/PL0043CX-001-2.jpg'),
    dict(key='recovery', short='Recovery and mobility', sub='Sauna &middot; cold plunge &middot; mobility tools',
         h2='Recovery|and mobility at home.',
         lead='Budget heat and cold for the house, and the mobility tools we use before and after class. If you have a heart condition or high blood pressure, talk to your doctor before you start sauna or cold plunge.',
         groups=[HC, MOB, MASS],
         photo='/images/training/group-warmup.webp'),
    dict(key='home-gym', short='Home gym', sub='For the garage',
         h2='The short list|for the garage.',
         lead='For the days you cannot make it in. You do not need much.',
         groups=['Weights', 'Bodyweight'],
         photo='/images/training/back-squat.webp'),
    dict(key='cardio', short='Treadmills and cardio', sub='MERACH',
         h2='Treadmills,|rowers and bikes.',
         lead='The MERACH lineup, starting with the treadmill in my garage.',
         groups=['Treadmills', 'Rowers and bikes'],
         photo='/images/gear/merach-t12-folded.jpg'),
    dict(key='desk', short='Desk setup', sub='UPLIFT &middot; MERACH',
         h2='The desk I work at,|and what goes under it.',
         lead='If you sit for a living, this is the most useful thing on the page.',
         groups=['Desk and walking pad', 'Standing comfort'],
         photo='https://cdn11.bigcommerce.com/s-l85bzww3lo/products/890/images/38645/Final_MVT011_and_UPL964_Inclining_Walking_01496_2__22750.1787774251.1217.655.jpg'),
    dict(key='watches', short='Watches', sub='Suunto',
         h2='Watches|and heart rate.',
         lead='Steps, sleep, heart rate and training load, from a watch that keeps going between charges.',
         groups=['GPS watches', 'Heart rate'],
         photo='/images/training/outdoor-run.webp'),
]

# The feature at the top of the page. A real photo of a real product we own.
FEATURE = dict(id='merach-t12-pro', photo='/images/gear/merach-t12-garage-wide.jpg',
               kicker='Treadmills and cardio &middot; Coach pick',
               title='MERACH T12 Pro treadmill',
               line='The one in my garage. It folds flat against the wall, runs a 15 percent auto incline, and has over a hundred miles on it so far.')

RAILS = [
    ('picks', 'Coach picks', 'pick'),
    ('budget', 'Budget picks', 'budget'),
    ('splurge', 'Worth the splurge', 'splurge'),
]

# Brand front doors on the supplements shelf. Impact links with no u= land on
# the brand's home page, still tracked to the account.
BRANDS = [
    ('Thorne', 'The full Thorne shelf', '/supplements', False),
    ('1st Phorm', 'All 81 products', '#first-phorm', False),
    ('Transparent Labs', 'Shop the brand', 'https://transparentlabs.sjv.io/c/7701857/1281413/15725', True),
    ('Swolverine', 'Shop the brand', 'https://swolverine.sjv.io/c/7701857/3257284/41450', True),
    ('C4', 'Shop the brand', 'https://cellucor.sjv.io/c/7701857/3960641/54611', True),
    ('Beam', 'Shop the brand', 'https://beam.sjv.io/c/7701857/1111247/14102', True),
]

SRC_CTA = {'amazon': 'Amazon'}
OUT = ' target="_blank" rel="nofollow sponsored noopener"'


def e(s):
    return html.escape(s, quote=True)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def gid(shelf, group):
    return f'{shelf}-{slug(group)}'


def shelf_items(key):
    return [p for p in P if p['shelf'] == key]


def tile(p, compact=False):
    src = p['src']
    cta = p.get('cta') or SRC_CTA.get(src) or p['brand']
    kw = (p.get('kw', '') + ' ' + p['brand'].lower()).strip()
    if p.get('pick'):
        tag = '<span class="ptag">Coach pick</span>'
    elif p.get('budget'):
        tag = '<span class="ptag ptag-w">Budget pick</span>'
    else:
        tag = ''
    if src == 'amazon':
        href = f'https://www.amazon.com/dp/{p["asin"]}/?tag={AMAZON_TAG}'
        media = '<span class="ptile-img amz-img" aria-hidden="true"></span>'
        attrs = f' data-asin="{p["asin"]}"'
        price = '<b class="amz-price"></b>'
        cls = 'ptile no-price amz'
    else:
        href = p['url']
        well = 'ptile-img is-cover' if p.get('cover') else 'ptile-img'
        media = (f'<span class="{well}"><img src="{e(p["img"])}" alt="" loading="lazy" decoding="async"'
                 f' onerror="this.closest(\'.ptile\').classList.add(\'no-img\');this.closest(\'.ptile-img\').style.display=\'none\'"></span>')
        attrs = ''
        price = ''
        cls = 'ptile no-price'
    blurb = '' if compact else f'<span class="ptile-blurb">{p["blurb"]}</span>'
    return (f'<a class="{cls}" href="{e(href)}"{OUT}'
            f' data-product="{e(p["name"])}" data-brand="{e(p["brand"])}" data-src="{src}" data-kw="{e(kw)}"{attrs}>'
            f'{tag}{media}<span class="ptile-brand">{e(p["brand"])}</span>'
            f'<span class="ptile-name">{e(p["name"])}</span>{blurb}'
            f'<span class="ptile-foot">{price}<em>Shop at {e(cta)}<span aria-hidden="true">&nbsp;&rarr;</span></em></span></a>')


def reviews_row(items):
    revs = [(p['name'], p['edc']) for p in items if p.get('edc')]
    if not revs:
        return ''
    links = ''.join(f'<a class="finder-chip" href="{EDC}{s_}" target="_blank" rel="noopener">{e(n)}</a>' for n, s_ in revs)
    return ('<div class="edc-row"><b>Full reviews on Every Dad Carry</b>'
            f'<div class="finder-chips">{links}</div></div>')


def render_phorm():
    """The 1st Phorm block on the supplements shelf, for people who already
    buy the brand: best sellers as photo tiles, the rest of the most-asked
    list as chips, and the full catalog collapsed into a column directory.
    The tile grid is a .shelf-group so search filters it like any other."""
    groups = json.loads((ROOT / 'tools' / 'phorm-catalog.json').read_text())
    top, rest = groups[0], groups[1:]
    tiled = [p for p in P if p.get('group') == PH]
    tiled_urls = {p['url'] for p in tiled} | {p['url'] for p in P if p['brand'] == '1st Phorm' and p.get('url')}
    left = [(h, n) for h, n in top['items'] if phorm(h) not in tiled_urls]
    chips = ''.join(f'<a class="finder-chip" href="{phorm(h)}"{OUT}>{e(n)}</a>' for h, n in left)
    cols = ''.join(
        f'<div class="catalog-group"><h4>{e(g["title"])}</h4><ul class="catalog-list">'
        + ''.join(f'<li><a href="{phorm(h)}"{OUT}>{e(n)}</a></li>' for h, n in g['items'])
        + '</ul></div>' for g in rest)
    n_rest = sum(len(g['items']) for g in rest)
    return (
        '<div class="sf-phorm" id="first-phorm">'
        '<div class="sf-phorm-head sf-phorm-head-text">'
        '<div><span class="eyebrow">Legionnaire partner</span>'
        '<h3 class="sf-phorm-title">Already buy 1st Phorm?<br><span class="outline">Then buy 1st Phorm.</span></h3></div>'
        '<p>We are a Legionnaire partner as well as a Thorne one, because people want different things out of a tub '
        'and you should get to pick which. Every 1st Phorm link here is tracked to my account, at the same price you&rsquo;d pay going direct.</p>'
        '</div>'
        f'<div class="shelf-group"><h4 class="shelf-sub">Their best sellers<span>{len(tiled)} picks</span></h4>'
        f'<div class="shop-grid">{"".join(tile(p) for p in tiled)}</div></div>'
        + (f'<h4 class="sf-mini-h sf-also">Also asked for</h4><div class="finder-chips">{chips}</div>' if chips else '')
        + f'<details class="catalog"><summary>The rest of the catalog<span>{n_rest} products</span></summary>'
        f'<div class="catalog-body sf-catalog-cols">{cols}</div></details>'
        '</div>')


def render_brands():
    cells = ''.join(
        f'<a class="sf-brand" href="{e(u)}"{OUT if ext else ""}><b>{e(n)}</b><span>{e(t)}<span aria-hidden="true">&nbsp;&rarr;</span></span></a>'
        for n, t, u, ext in BRANDS)
    return f'<div class="sf-brands"><h4 class="sf-mini-h">Shop by brand</h4><div class="sf-brand-row">{cells}</div></div>'


def render_storefront():
    out = []
    for sh in SHELVES:
        key = sh['key']
        items = shelf_items(key)
        groups = sh['groups']
        missing = {p.get('group') for p in items} - set(groups) - {PH}
        if missing:
            raise SystemExit(f'{key}: products in groups not listed in SHELVES: {missing}')
        # Section keywords are the shelf and group names only. Product words
        # stay on the tiles, so "cold plunge" returns the two tubs, not the
        # whole recovery shelf.
        a, b_ = sh['h2'].split('|', 1)
        title = f'{e(a.strip())}<br><span class="outline">{e(b_.strip())}</span>'
        subnav = ''.join(
            f'<a href="#{gid(key, g)}">{e(g)}<span>{sum(1 for p in items if p.get("group") == g)}</span></a>'
            for g in groups)
        if key == 'supplements':
            subnav += f'<a href="#first-phorm">1st Phorm<span>{sum(1 for p in items if p.get("group") == PH)}</span></a>'
        body = []
        for g in groups:
            gi = [p for p in items if p.get('group') == g]
            tiles = ''.join(tile(p) for p in gi)
            body.append(f'<div class="shelf-group" id="{gid(key, g)}"><h3 class="shelf-sub">{e(g)}<span>{len(gi)} picks</span></h3>'
                        f'<div class="shop-grid">{tiles}</div></div>')
        extra = (render_brands() + render_phorm()) if key == 'supplements' else ''
        out.append(
            f'<section class="sect shelf-sect sf-shelf" id="{key}" aria-label="{e(sh["short"])}" '
            f'data-kw="{e(sh["short"].lower())}">'
            f'<div class="wrap"><div class="sf-shelf-head"><div><span class="eyebrow">{sh["sub"]}</span><h2>{title}</h2></div>'
            f'<p class="lead">{sh["lead"]}</p></div>'
            f'<div class="sf-subnav" role="navigation" aria-label="{e(sh["short"])} sections">{subnav}</div>'
            f'{"".join(body)}{extra}{reviews_row(items)}</div></section>')
    return '\n'.join(out)


def render_bar():
    links = ''.join(f'<a href="#{s_["key"]}" data-shelf="{s_["key"]}">{e(s_["short"])}</a>' for s_ in SHELVES)
    return f'<div class="sf-bar-in wrap">{links}</div>'


def render_directory():
    cols = []
    for sh in SHELVES:
        key = sh['key']
        n = len(shelf_items(key))
        lis = [f'<li><a href="#{gid(key, g)}">{e(g)}</a></li>' for g in sh['groups']]
        if key == 'supplements':
            lis.append('<li><a href="#first-phorm">1st Phorm</a></li>')
            lis.append('<li><a href="/supplements">The Thorne shelf</a></li>')
        cols.append(f'<div class="sf-dir-col"><a class="sf-dir-h" href="#{key}">{e(sh["short"])}<span>{n}</span></a>'
                    f'<ul>{"".join(lis)}</ul></div>')
    return '<div class="sf-dir">' + ''.join(cols) + '</div>'


def render_feature():
    by = {p['id']: p for p in P}
    p = by[FEATURE['id']]
    review = (f'<a class="btn btn-ghost" href="{EDC}{p["edc"]}" target="_blank" rel="noopener">Read the full review</a>'
              if p.get('edc') else '')
    return (
        f'<a class="sf-hero-img" href="{e(p["url"])}"{OUT} aria-label="{e(FEATURE["title"])} at {e(p["brand"])}">'
        f'<img src="{FEATURE["photo"]}" alt="The MERACH T12 Pro treadmill in Mike&rsquo;s garage" decoding="async"></a>'
        f'<div class="sf-hero-cap"><span class="sf-kicker">{FEATURE["kicker"]}</span>'
        f'<h2 class="sf-hero-title">{e(FEATURE["title"])}</h2><p>{FEATURE["line"]}</p>'
        f'<p class="sf-hero-cta"><a class="btn btn-y" href="{e(p["url"])}"{OUT}>Shop at {e(p["brand"])}</a>{review}</p></div>')


def render_rails():
    tabs, panels = [], []
    for i, (rid, label, flag) in enumerate(RAILS):
        items = [p for p in P if p.get(flag)]
        sel = 'true' if i == 0 else 'false'
        ti = '' if i == 0 else ' tabindex="-1"'
        tabs.append(f'<button type="button" role="tab" id="tab-{rid}" aria-controls="rail-{rid}" aria-selected="{sel}"'
                    f'{ti}>{e(label)}<span>{len(items)}</span></button>')
        panels.append(f'<div class="sf-rail" id="rail-{rid}" role="tabpanel" aria-labelledby="tab-{rid}" tabindex="0"'
                      f'{"" if i == 0 else " hidden"}>{"".join(tile(p, compact=True) for p in items)}</div>')
    return (f'<div class="sf-rail-head"><h2 class="sf-h">Featured</h2><div class="sf-tabs" role="tablist" aria-label="Featured products">{"".join(tabs)}</div>'
            '<div class="sf-rail-nav"><button type="button" class="sf-prev" aria-label="Scroll back">&larr;</button>'
            '<button type="button" class="sf-next" aria-label="Scroll forward">&rarr;</button></div></div>'
            + ''.join(panels))


def render_collections():
    cells = []
    for sh in SHELVES:
        n = len(shelf_items(sh['key']))
        cells.append(f'<a class="sf-col" href="#{sh["key"]}"><span class="sf-col-img"><img src="{e(sh["photo"])}" alt="" loading="lazy" decoding="async"></span>'
                     f'<b>{e(sh["short"])}</b><span class="sf-col-meta">{n} picks</span><span class="sf-col-go">Shop now</span></a>')
    return '<div class="sf-cols">' + ''.join(cells) + '</div>'


MINI = {
    'supplements': ['thorne-creatine', 'phorm-level-1', 'tl-whey', 'c4-original', 'swol-intra', 'beam-dream'],
    'meal-prep': ['trifecta-lean', 'fuel-meals', 'etekcity-scale', 'rubbermaid-glass', 'komuee-glass', 'trifecta-chicken'],
}


def render_mini(key):
    by = {p['id']: p for p in P}
    return '<div class="shop-grid mini-shop">' + ''.join(tile(by[i]) for i in MINI[key]) + '</div>'


def inject(path, marker, content):
    s = path.read_text(encoding='utf-8')
    pat = re.compile(rf'(<!-- GEAR:{marker}:START -->).*?(<!-- GEAR:{marker}:END -->)', re.S)
    if not pat.search(s):
        raise SystemExit(f'marker GEAR:{marker} not found in {path.name}')
    s = pat.sub(lambda m: m.group(1) + '\n' + content + '\n' + m.group(2), s, count=1)
    path.write_text(s, encoding='utf-8')


if __name__ == '__main__':
    ids = [p['id'] for p in P]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        raise SystemExit(f'duplicate ids: {dup}')
    amz = {p['asin'] for p in P if p['src'] == 'amazon'}
    if len(amz) > 40:
        raise SystemExit(f'{len(amz)} Amazon ASINs; /api/gear-amazon takes 40 per call')
    gear = ROOT / 'gear.html'
    inject(gear, 'BAR', render_bar())
    inject(gear, 'DIRECTORY', render_directory())
    inject(gear, 'FEATURE', render_feature())
    inject(gear, 'RAILS', render_rails())
    inject(gear, 'COLLECTIONS', render_collections())
    inject(gear, 'SHELVES', render_storefront())
    prog = ROOT / 'programs.html'
    inject(prog, 'MINI-SUPPLEMENTS', render_mini('supplements'))
    inject(prog, 'MINI-MEALPREP', render_mini('meal-prep'))
    counts = {}
    for p in P:
        counts[p['src']] = counts.get(p['src'], 0) + 1
    print(f'{len(P)} products', counts, f'{len(amz)} ASINs')
