(function(){
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* mobile nav toggle */
  var navList = document.getElementById('navLinks');
  var navToggle = document.getElementById('navToggle');
  if(navToggle && navList){
    navToggle.addEventListener('click', function(){
      var open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* theme toggle */
  (function themeToggle(){
    var btn = document.getElementById('themeToggle');
    if(!btn) return;
    var root = document.documentElement;
    function isDark(){ return root.getAttribute('data-theme') === 'dark'; }
    function sync(){
      var dark = isDark();
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    sync();
    btn.addEventListener('click', function(){
      var dark = !isDark();
      if(dark){ root.setAttribute('data-theme','dark'); } else { root.removeAttribute('data-theme'); }
      try{ localStorage.setItem('vss-theme', dark ? 'dark' : 'light'); }catch(e){}
      sync();
    });
  })();

  /* scroll reveal */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  },{threshold:.15}) : null;
  document.querySelectorAll('.reveal').forEach(function(el){
    if(reduceMotion || !io){ el.classList.add('in-view'); return; }
    io.observe(el);
  });

  /* animated stat counters */
  function animateCounter(el){
    var target = parseFloat(el.getAttribute('data-count'));
    if(isNaN(target) || el.dataset.counted) return;
    el.dataset.counted = '1';
    if(reduceMotion){ el.textContent = target; return; }
    var start = null, dur = 900;
    function step(ts){
      if(start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(p * target);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counterIo = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){ animateCounter(entry.target); counterIo.unobserve(entry.target); }
    });
  },{threshold:.4}) : null;
  document.querySelectorAll('[data-count]').forEach(function(el){
    if(reduceMotion || !counterIo){ animateCounter(el); } else { counterIo.observe(el); }
  });

  /* skills tag input (careers page) */
  (function tagInput(){
    var wrap = document.getElementById('skillTagWrap');
    if(!wrap) return;
    var input = document.getElementById('fr-skill-input');
    var tags = [];

    function render(){
      wrap.querySelectorAll('.tag-chip').forEach(function(c){ c.remove(); });
      tags.forEach(function(t, i){
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        var label = document.createElement('span');
        label.textContent = t;
        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label','Remove ' + t);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function(){ tags.splice(i,1); render(); syncHidden(); });
        chip.appendChild(label);
        chip.appendChild(removeBtn);
        wrap.insertBefore(chip, input);
      });
    }

    function syncHidden(){
      var hidden = document.getElementById('fr-skills-hidden');
      if(hidden) hidden.value = tags.join(', ');
    }

    function addTag(val){
      val = val.trim();
      if(val && tags.indexOf(val) === -1){ tags.push(val); render(); syncHidden(); }
      input.value = '';
    }

    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ','){
        e.preventDefault();
        addTag(input.value);
      } else if(e.key === 'Backspace' && !input.value && tags.length){
        tags.pop(); render(); syncHidden();
      }
    });
    input.addEventListener('blur', function(){ if(input.value) addTag(input.value); });

    window.getSkillTags = function(){ return tags.slice(); };
  })();

  /* resume file drop (careers page) */
  (function fileDrop(){
    var drop = document.getElementById('fileDrop');
    if(!drop) return;
    var input = document.getElementById('fr-resume');
    var nameEl = document.getElementById('fdName');
    var maxBytes = 5 * 1024 * 1024;

    function show(file){
      if(!file){ nameEl.textContent=''; return; }
      var okType = /\.(pdf|doc|docx)$/i.test(file.name);
      var okSize = file.size <= maxBytes;
      if(!okType || !okSize){
        nameEl.textContent = okType ? 'File is larger than 5MB' : 'Please use a PDF or Word file';
        nameEl.style.color = 'var(--secondary-deep)';
        input.value = '';
        return;
      }
      nameEl.style.color = 'var(--ink)';
      nameEl.textContent = file.name + ' (' + Math.round(file.size/1024) + ' KB)';
    }

    input.addEventListener('change', function(){ show(input.files[0]); });
    ['dragover','dragenter'].forEach(function(ev){
      drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('drag'); });
    });
    ['dragleave','drop'].forEach(function(ev){
      drop.addEventListener(ev, function(){ drop.classList.remove('drag'); });
    });
    drop.addEventListener('drop', function(e){
      e.preventDefault();
      if(e.dataTransfer.files.length){ input.files = e.dataTransfer.files; show(input.files[0]); }
    });
  })();

  /* shared Netlify AJAX submit helper */
  function submitToNetlify(form, onSuccess, onError){
    var fd = new FormData(form);
    fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      body: fd
    }).then(function(res){
      if(res.ok){ onSuccess(); } else { onError(); }
    }).catch(function(){ onError(); });
  }

  /* fresher application form (careers page) */
  (function fresherForm(){
    var form = document.getElementById('fresherForm');
    if(!form) return;
    var success = document.getElementById('fresherSuccess');
    var recap = document.getElementById('fresherRecap');
    var errMsg = document.getElementById('fresherErr');
    var submitBtn = form.querySelector('button[type=submit]');

    function setInvalid(name, invalid){
      var field = form.querySelector('[data-field="' + name + '"]');
      if(field) field.classList.toggle('invalid', invalid);
    }
    function phoneValid(v){ return /^[0-9+\-\s()]{7,16}$/.test(v.trim()); }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(errMsg) errMsg.classList.remove('show');
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var gradyear = form.gradyear.value.trim();
      var degree = form.degree.value.trim();
      var college = form.college.value.trim();
      var why = form.why.value.trim();
      var resumeFile = form.resume.files[0];
      var skills = window.getSkillTags ? window.getSkillTags() : [];
      var consentOk = form.consent && form.consent.checked;

      var ok = true;
      function mark(field, bad){ setInvalid(field, bad); if(bad) ok = false; }

      mark('name', !name);
      mark('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      mark('phone', !phoneValid(phone));
      mark('gradyear', !gradyear || +gradyear < 1980 || +gradyear > 2035);
      mark('degree', !degree);
      mark('college', !college);
      mark('skills', skills.length === 0);
      mark('resume', !resumeFile);
      mark('why', why.length < 20);
      mark('consent', !consentOk);

      if(!ok){
        var firstInvalid = form.querySelector('.field.invalid');
        if(firstInvalid){ firstInvalid.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'center'}); }
        return;
      }

      if(submitBtn) submitBtn.disabled = true;
      submitToNetlify(form, function(){
        recap.innerHTML = '<strong>' + name + '</strong> &middot; ' + degree + ', ' + college + ' (' + gradyear + ')<br>Skills: ' + skills.join(', ') + '<br>Resume: ' + resumeFile.name;
        form.style.display = 'none';
        success.classList.add('show');
      }, function(){
        if(submitBtn) submitBtn.disabled = false;
        if(errMsg) errMsg.classList.add('show');
      });
    });
  })();

  /* contact form (contact page) */
  (function contactFormHandler(){
    var form = document.getElementById('contactForm');
    if(!form) return;
    var msg = document.getElementById('formMsg');
    var errMsg = document.getElementById('formErr');
    var submitBtn = form.querySelector('button[type=submit]');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(errMsg) errMsg.classList.remove('show');
      var consentField = form.querySelector('[data-field="consent"]');
      var consentOk = form.consent && form.consent.checked;
      if(consentField) consentField.classList.toggle('invalid', !consentOk);
      if(!consentOk){
        if(consentField){ consentField.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'center'}); }
        return;
      }
      if(submitBtn) submitBtn.disabled = true;
      submitToNetlify(form, function(){
        form.reset();
        if(submitBtn) submitBtn.disabled = false;
        msg.classList.add('show');
      }, function(){
        if(submitBtn) submitBtn.disabled = false;
        if(errMsg) errMsg.classList.add('show');
      });
    });
  })();

  /* work-with-us: option cards + conditional fields + client inquiry form */
  (function clientInquiry(){
    var group = document.getElementById('inquiryTypeGroup');
    if(!group) return;
    var radios = group.querySelectorAll('input[name="inquiryType"]');
    var staffingExtra = document.getElementById('staffingExtra');
    var typeMap = { staffing:'Hire developers', custom:'Build custom software', ai:'AI / ML solution', salesforce:'Salesforce support' };

    function updateStaffingVisibility(){
      var checked = group.querySelector('input[name="inquiryType"]:checked');
      var isStaffing = !!checked && checked.value === typeMap.staffing;
      if(staffingExtra){
        staffingExtra.classList.toggle('show', isStaffing);
        staffingExtra.querySelectorAll('input').forEach(function(inp){ inp.required = isStaffing; });
      }
      return isStaffing;
    }

    radios.forEach(function(r){
      r.addEventListener('change', function(){
        updateStaffingVisibility();
        var target = document.getElementById('inquiryFormFields');
        if(target){ target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'}); }
      });
    });

    try{
      var params = new URLSearchParams(window.location.search);
      var typeParam = params.get('type');
      if(typeParam && typeMap[typeParam]){
        for(var i=0;i<radios.length;i++){
          if(radios[i].value === typeMap[typeParam]){ radios[i].checked = true; break; }
        }
      }
    }catch(e){}
    updateStaffingVisibility();

    var form = document.getElementById('clientInquiryForm');
    if(!form) return;
    var success = document.getElementById('inquirySuccess');
    var errMsg = document.getElementById('inquiryErr');
    var submitBtn = form.querySelector('button[type=submit]');

    function setInvalid(name, invalid){
      var field = form.querySelector('[data-field="' + name + '"]');
      if(field) field.classList.toggle('invalid', invalid);
    }
    function phoneValid(v){ return /^[0-9+\-\s()]{7,16}$/.test(v.trim()); }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(errMsg) errMsg.classList.remove('show');
      var checked = form.querySelector('input[name="inquiryType"]:checked');
      var company = form.company.value.trim();
      var contactPerson = form.contactPerson.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var description = form.description.value.trim();
      var consentOk = form.consent && form.consent.checked;
      var isStaffing = updateStaffingVisibility();

      var ok = true;
      function mark(field, bad){ setInvalid(field, bad); if(bad) ok = false; }

      mark('inquiryType', !checked);
      mark('company', !company);
      mark('contactPerson', !contactPerson);
      mark('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      mark('phone', !phoneValid(phone));
      mark('description', description.length < 10);
      mark('timeline', !form.timeline.value);
      if(isStaffing){
        mark('rolesNeeded', !form.rolesNeeded.value.trim());
        mark('numPositions', !form.numPositions.value);
      }
      mark('consent', !consentOk);

      if(!ok){
        var firstInvalid = form.querySelector('.field.invalid');
        if(firstInvalid){ firstInvalid.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'center'}); }
        return;
      }

      if(submitBtn) submitBtn.disabled = true;
      submitToNetlify(form, function(){
        form.style.display = 'none';
        success.classList.add('show');
      }, function(){
        if(submitBtn) submitBtn.disabled = false;
        if(errMsg) errMsg.classList.add('show');
      });
    });
  })();

  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
})();
